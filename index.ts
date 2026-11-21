import { registerRootComponent } from 'expo';
import App from './App';
import { registerServiceWorker } from './src/services/pushNotifications';

registerRootComponent(App);
registerServiceWorker();
