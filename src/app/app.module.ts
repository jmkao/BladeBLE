import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicApp, IonicModule } from 'ionic-angular';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { BleModalPage } from '../pages/ble-modal/ble-modal';

import { BleService } from '../services/ble-service';

import { ComponentsModule } from "../components/components.module";

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { BLE } from '@ionic-native/ble';

import { Pro } from '@ionic/pro';

const IonicPro = Pro.init('7a92ab8e', {
  appVersion: "0.0.4"
});

export class MyErrorHandler implements ErrorHandler {
  handleError(err: any): void {
    IonicPro.monitoring.handleNewError(err);
  }
}

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    ListPage,
    BleModalPage
  ],
  imports: [
    BrowserModule,
    ComponentsModule,
    CommonModule,
    IonicModule.forRoot(MyApp),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    ListPage,
    BleModalPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    BLE,
    BleService,
    {provide: ErrorHandler, useClass: MyErrorHandler}
  ]
})
export class AppModule {}
