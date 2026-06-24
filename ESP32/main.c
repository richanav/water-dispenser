#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "nvs_flash.h"

#include "esp_http_client.h"

#include "driver/gpio.h"

// ==========================================
// WIFI CREDENTIALS
// ==========================================

#define WIFI_SSID      "Tuxsemi_2.4G"
#define WIFI_PASSWORD  "Tuxsemite@123"

// ==========================================
// GPIO
// ==========================================

#define BUTTON_PIN GPIO_NUM_27
static QueueHandle_t sensor_queue;

// ==========================================
// BACKEND URL
// ==========================================

#define SERVER_URL "http://192.168.1.47:3000/update-water-level"

// ==========================================
// WIFI FUNCTION
// ==========================================

void wifi_init()
{
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASSWORD,
        },
    };

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
    esp_wifi_connect();

    printf("\n=================================\n");
    printf("CONNECTING TO WIFI...\n");
    printf("=================================\n");

    while (1)
    {
        wifi_ap_record_t wifidata;

        if (esp_wifi_sta_get_ap_info(&wifidata) == ESP_OK)
        {
            printf("\n=================================\n");
            printf("WIFI CONNECTED\n");
            printf("=================================\n");
            break;
        }

        printf("Waiting for WiFi...\n");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

// ==========================================
// SEND DATA TO SERVER
// ==========================================

void send_water_level(const char *level)
{
    esp_http_client_config_t config = {
        .url = SERVER_URL,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);

    esp_http_client_set_method(client, HTTP_METHOD_POST);

    esp_http_client_set_header(client, "Content-Type", "application/json");

    char post_data[200];

sprintf(
    post_data,
    "{"
    "\"device_id\":\"water_device_20\","
    "\"water_level\":\"%s\""
    "}",
    level
);

    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    printf("Sending Data: %s\n", post_data);

    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK)
    {
        printf("Data sent successfully\n");

        int status_code = esp_http_client_get_status_code(client);

        printf("HTTP Status = %d\n", status_code);
    }
    else
    {
        printf("Failed to send data\n");
        printf("Error: %s\n", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);
}



static void IRAM_ATTR sensor_isr_handler(void *arg)
{
    int gpio_num = (int)arg;
    xQueueSendFromISR(sensor_queue, &gpio_num, NULL);
}
// ==========================================
// SENSOR TASK
// ==========================================

void sensor_task(void *pvParameters)
{
    int gpio_num;
    int previousState = -1;

    while (1)
    {
        if (xQueueReceive(sensor_queue, &gpio_num, portMAX_DELAY))
        {
            vTaskDelay(pdMS_TO_TICKS(200));

            int state = gpio_get_level(BUTTON_PIN);

            printf("GPIO State = %d\n", state);

            // Optocoupler is inverting logic:
            // state == 0 means sensor detected water
            if (state == 0)
            {
                printf("WATER PRESENT / HIGH\n");

                if (previousState != 0)
                {
                    send_water_level("high");
                    previousState = 0;
                }
            }
            else
            {
                printf("WATER ABSENT / LOW\n");

                if (previousState != 1)
                {
                    send_water_level("low");
                    previousState = 1;
                }
            }
        }
    }
}




// MAIN


void app_main(void)
{
    printf("\n=================================\n");
    printf("ESP32 WATER LEVEL TEST\n");
    printf("=================================\n");

    esp_err_t ret = nvs_flash_init();

    if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
        ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        nvs_flash_erase();
        nvs_flash_init();
    }

    gpio_config_t io_conf = {};

    io_conf.pin_bit_mask = (1ULL << BUTTON_PIN);
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.intr_type = GPIO_INTR_ANYEDGE;   

    gpio_config(&io_conf);
    
    sensor_queue = xQueueCreate(10, sizeof(int));

    gpio_install_isr_service(0);

    gpio_isr_handler_add(BUTTON_PIN, sensor_isr_handler, (void *)BUTTON_PIN);

    wifi_init();

    xTaskCreate(
        sensor_task,
        "sensor_task",
        4096,
        NULL,
        1,
        NULL
    );
    
    int state = gpio_get_level(BUTTON_PIN);

    if (state == 0)
    {
        send_water_level("high");
    }
    else
    {
        send_water_level("low");
    }
}
