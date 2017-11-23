import { Component } from '@angular/core';
import { Platform, ModalController, Modal } from 'ionic-angular';

import { Pro } from '@ionic/pro';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';

import { BleService } from '../../services/ble-service';
import { BleModalPage } from '../../pages/ble-modal/ble-modal';

const DEFAULT_BRIGHTNESS = 64;
const DEFAULT_DIM_LEVEL = 2;
const MIN_UPDATE_INTERVAL_MS = 60;

/**
 * BleComponent
 * 
 * Template is simple status as a string, and contains color based interfaces
 * for updating relay controller
 */
@Component({
  selector: 'ble',
  templateUrl: 'ble.html'
})
export class BleComponent {

  status:string;
  bleSubscription: Subscription;
  bleObservable: Observable<string>;
  bleModal:Modal = null;
  dummyBLE:boolean = true;

  private lastUpdateMs:number = 0;

  private h:number = 0;
  private s:number = 255;
  v:number = DEFAULT_BRIGHTNESS;
  private dim = DEFAULT_DIM_LEVEL;
  private pH:number = 0;
  private pS:number = 255;
  private pV:number = DEFAULT_BRIGHTNESS;
  private pDim = DEFAULT_DIM_LEVEL;
  private off:boolean = true;
  private cycle:boolean = false;

  constructor(public bleService: BleService, public modalCtrl: ModalController, public platform:Platform) {
    this.status = bleService.status;
    this.bleObservable = bleService.bleStatusSource.asObservable();
    this.bleSubscription = bleService.bleStatusSource.asObservable().subscribe(
      newStatus => {
        this.changeStatus(newStatus);
      }
    )

    this.platform.ready().then(() => {
      console.log(this.platform.platforms());
      Pro.getApp().monitoring.log("App launched on: "+this.platform.platforms(), { level: 'info' });
      if (this.platform.is("cordova")) {
        // Only init on cordova platforms
        Pro.getApp().monitoring.call(() => {
          setTimeout(() => {
            this.bleService.init();            
          }, 1000);
        });
        this.dummyBLE = false;
      }
    });
  }

    public updateOff() {
    console.log("BleComponent updateOff()");
    this.cycle = false;
    this.off = true;
    this.sendUpdate();
  }

  public updateReset() {
    console.log("BleComponent updateReset()")
    this.cycle = false;
    this.h = 0;
    this.s = 255;
    this.v = 64;
    this.off = true;
    this.sendUpdate();
  }

  public updateHS(h:number, s:number) {
    console.log("BleComponent updateHS()");
    this.cycle = false;
    this.h = h;
    this.s = s;
    this.off = false;
    this.sendUpdate();
  }

  public updateHSV(h:number, s:number, v:number) {
    console.log("BleComponent updateHSV()");
    this.cycle = false;
    this.h = h;
    this.s = s;
    this.v = v;
    this.off = false;
    this.sendUpdate();
  }

  public updateDim(newDim:number) {
    this.dim = newDim;
    this.sendUpdate();
  }

  public cycleHS(hsArray:number[][], delayMs:number) {
    this.cycle = true;
    console.log("Cycle on");

    var counter = 0;
    var looper = () => {
      if (this.cycle == true) {
        var index = counter%hsArray.length;
        counter++;
        this.updateHS(hsArray[index][0], hsArray[index][1]);
        this.cycle = true;
        console.log("Cycle loop")

        setTimeout(looper, delayMs);
      } else {
        this.updateOff();
      }
    }

    looper();
  }

  public sendUpdate() {
    if (this.dummyBLE) {
      return;
    }
    let curMs = new Date().getTime();
    console.log("sendUpdate() requested at "+curMs);    
    if (curMs - this.lastUpdateMs > MIN_UPDATE_INTERVAL_MS) {
      // Only update if MIN_UPDATE_INTERVAL_MS has passed since last update
      if (!this.off) {
        // Only if we're on
        this.bleService.writeHSV((this.dim*360)+this.h, this.s, this.v);
        this.pH = this.h;
        this.pS = this.s;
        this.pV = this.v;
        this.pDim = this.dim;
        this.lastUpdateMs = curMs;
      } else {
        // We're off
        this.bleService.writeHSV(0, 0, 0);
        this.lastUpdateMs = curMs;
      }
    } else {
      console.log("sendUpdate() supressed due to min update interval");
    }
  }

  changeStatus(newStatus:string) {
    //let oldStatus = this.status;
    console.log("BLE status changed to "+newStatus);
    this.status = newStatus;
    if (this.bleModal == null && this.status != "Connected") {
      console.log("BLE entering unconnected state - show modal");
      this.openBLEModal();
    } else if (this.bleModal != null && this.status == "Connected") {
      console.log("BLE is connected - hide modal");
      this.bleModal.dismiss();
      this.bleModal = null;
    }
  }

  public openBLEModal() {
    this.bleModal = this.modalCtrl.create(BleModalPage);
    this.bleModal.present();
  }

}
