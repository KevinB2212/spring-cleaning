import { getMessaging } from "firebase/messaging";
import app from "./firebase";

export const messaging = getMessaging(app);
