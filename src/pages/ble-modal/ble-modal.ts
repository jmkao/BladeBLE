import { Component } from '@angular/core';
import { ViewController, NavParams } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';

import { BleService } from '../../services/ble-service';

/**
 * Generated class for the BleModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

//@IonicPage()
@Component({
  templateUrl: 'ble-modal.html',
})
export class BleModalPage {

  bleStatus: string;

  subscription: Subscription;

  constructor(public viewCtrl: ViewController, public navParams: NavParams, public bleService:BleService) {
    this.bleStatus = bleService.status;
    this.subscription = bleService.bleStatusUpdate$.subscribe(
      bleStatus => {
        this.bleStatus = bleStatus;
        console.log("BleModal: Status changed to: "+this.bleStatus);
      }
    )
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  ngOnDestroy() {
    // prevent memory leak when component destroyed
    console.log("BleModal Destroyed");
    this.subscription.unsubscribe();
  }

}
