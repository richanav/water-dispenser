import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyA6MGlStY9K93g23y6j2JeTFoSceNJk-1o",

  authDomain: "water-dispenser-b9f9a.firebaseapp.com",

  projectId: "water-dispenser-b9f9a"

};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);