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
    this.bleStatus = bleService.bleStatus;
    this.subscription = bleService.bleStatusUpdate$.subscribe(
      bleStatus => {
        this.bleStatus = bleStatus;
      }
    )
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad BleModalPage');
  }

  ngOnDestroy() {
    // prevent memory leak when component destroyed
    this.subscription.unsubscribe();
  }

}
