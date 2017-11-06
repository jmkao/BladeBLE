import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { BleModalPage } from './ble-modal';

@NgModule({
  declarations: [
    BleModalPage,
  ],
  imports: [
    IonicPageModule.forChild(BleModalPage),
  ],
})
export class BleModalPageModule {}
