Getting started
1. Pull the code 
2. Make the circuit connections given below:

## Circuit Connection

![Sensor Connection](images/interface_diagram.png)


3. Make sure to change the IP address in the URL to your computer IP address in the ESP code and App.jsx file inside the function App(). To find IP address, go to terminal and run hostname -I command. 
4. Now to run the frontend, type the command npm run dev in your terminal.
5. Now use another terminal to run your backend. Type the command node server.cjs to run the backend. 

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
