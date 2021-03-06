import { Component } from '@angular/core';
import { Platform, ModalController, Modal } from 'ionic-angular';

import { Pro } from '@ionic/pro';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';

import { BleService } from '../../services/ble-service';
import { BleModalPage } from '../../pages/ble-modal/ble-modal';
import { isDefined } from 'ionic-angular/util/util';

const DEFAULT_BRIGHTNESS = 120;
const DEFAULT_DIM_LEVEL = 1;
const MIN_UPDATE_INTERVAL_MS = 90;
const FADE_UPDATE_INTERVAL_MS = MIN_UPDATE_INTERVAL_MS+10;
const UO_HSV = [30, 255, 255];

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
  private looperTimeout:number = undefined;

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
    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
      console.log("off in the middle of looper, delaying command");
      this.cycle = false;
      setTimeout( () => {        
        this.sendUpdate();
      }, MIN_UPDATE_INTERVAL_MS*1.2);
    } else {
      this.sendUpdate();
    }
  }

  public updateReset() {
    console.log("BleComponent updateReset()")
    this.cycle = false;
    this.off = true;
    this.dim = DEFAULT_DIM_LEVEL;
    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
      console.log("reset in the middle of looper, delaying command");      
      this.cycle = false;
      setTimeout( () => {
        this._updateHSV(0, 255, DEFAULT_BRIGHTNESS);
      }, MIN_UPDATE_INTERVAL_MS*1.2);
    } else {
      this._updateHSV(0, 255, DEFAULT_BRIGHTNESS);      
    }
  }

  public updateHS(h:number, s:number) {
    console.log("BleComponent updateHS()");
    this.updateHSV(h, s, this.v);
  }

  public updateHSV(h:number, s:number, v:number) {
    console.log("BleComponent updateHSV()");
    this.cycle = false;
    this.off = false;
    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
      setTimeout( () => {
        this._updateHSV(h, s, v);        
      }, MIN_UPDATE_INTERVAL_MS*1.2);
    } else {
      this._updateHSV(h, s, v);      
    }
  }

  public updateDim(newDim:number) {
    this.dim = newDim;
    this.sendUpdate();
  }

  public cycleHS(hsArray:number[][], delayMs:number) {
    this.cycle = true;
    this.off = false;
    console.log("Cycle on");

    let counter = 0;

    let looper = () => {
      if (this.cycle == true) {
        let index = counter%hsArray.length;
        counter++;
        this._updateHSV(hsArray[index][0], hsArray[index][1], this.v);
        //console.log("Cycle loop")

        this.looperTimeout = setTimeout(looper, delayMs);
      } else {
        console.log("cycle terminated");
        //this.updateOff();
      }
    }

    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
    }
    looper();
  }

  public cycleFadeHS(hsArray:number[][], durationMs:number) {
    this.cycle = true;
    this.off=false;
    console.log("Cycle fade on");

    let counter = 0;

    let sequenceCallback = () => {
      if (this.cycle == true) {
        let index = counter%hsArray.length;
        counter++;
        let nextIndex = counter%hsArray.length;
        this.fadeHSV([hsArray[index][0], hsArray[index][1], this.v], [hsArray[nextIndex][0], hsArray[nextIndex][1], this.v], durationMs, sequenceCallback);
      } else {
        console.log("Cycle fade terminated");
        return;
      }
    }

    sequenceCallback();
  }

  public uoDecay() {
    this.cycle = true;
    this.off = false;
    
    let startMs = new Date().getTime();
    console.log("UO requested");
    
    let looper = () => {
      if (this.cycle == false) {
        console.log("UO terminated");
        //this.updateOff();
        return;
      }

      let curMs = new Date().getTime();
      let t = (curMs - startMs)/1000;

      const a = -0.0004471;
      const b = 0.1524;
      const c = 1.278;
      const d = 0.1003;

      let coeff = a*t + b + c*Math.pow(2, -d*t);

      if (coeff < 0) {
        console.log("UO reached 0. Terminating.");
        return;
      }

      let ratio = Math.min(1, coeff);

      this._updateHSV(UO_HSV[0], UO_HSV[1], Math.trunc(UO_HSV[2]*ratio));

      this.looperTimeout = setTimeout(looper, FADE_UPDATE_INTERVAL_MS);
    }

    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
    }
    looper();
  }

  public decayV(startHSV:number[], halfLifeMs:number) {
    this.cycle = true;
    this.off = false;
    
    let startMs = new Date().getTime();
    console.log("Decay started at "+startMs);

    let looper = () => {
      if (this.cycle == false) {
        console.log("Decay terminated");
        //this.updateOff();
        return;
      }

      let curMs = new Date().getTime();
      let ratio = Math.pow(2, -(curMs - startMs)/halfLifeMs);
      this._updateHSV(startHSV[0], startHSV[1], startHSV[2]*ratio);

      this.looperTimeout = setTimeout(looper, FADE_UPDATE_INTERVAL_MS);
    }

    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
    }
    looper();
  }

  public fadeOutHS(fromHS:number[], durationMs) {
    let fromHSV = [fromHS[0], fromHS[1], 255];
    let toHSV = [fromHS[0], fromHS[1], 16];

    this.fadeHSV(fromHSV, toHSV, durationMs);
  }

  public fadeHS(fromHS:number[], toHS:number[], durationMs:number) {
    let fromHSV = [fromHS[0], fromHS[1], this.v];
    let toHSV = [toHS[0], toHS[1], this.v];

    this.fadeHSV(fromHSV, toHSV, durationMs);
  }

  public fadeHSV(fromHSV:number[], toHSV:number[], durationMs:number, callback?:()=>void) {
    this.cycle = true;
    this.off = false;

    if (fromHSV[0] == 360) {
      if (toHSV[0] < 180) {
        fromHSV[0] = 0;
      }
    } else if (fromHSV[0] == 0) {
      if (toHSV[0] >= 180) {
        fromHSV[0] = 360;
      }
    }

    if (toHSV[0] == 360) {
      if (fromHSV[0] < 180) {
        toHSV[0] = 0;
      }
    } else if (toHSV[0] == 0) {
      if (fromHSV[0] >= 180) {
        toHSV[0] = 360;
      }
    }
    
    let startMs = new Date().getTime();
    let dH = toHSV[0] - fromHSV[0];
    let dS = toHSV[1] - fromHSV[1];
    let dV = toHSV[2] - fromHSV[2];

    console.log("Fade started at "+startMs);

    let looper = () => {
      if (this.cycle == false) {
        console.log("Fade terminated");
        //this.updateOff();
        return;
      }

      let curMs = new Date().getTime();
      let ratio = (curMs - startMs) / durationMs;
      if (ratio > 1) {
        if (isDefined(callback)) {
          callback();
          return;
        } else {
          // reverse the fade
          ratio = 0;
          fromHSV[0] = toHSV[0];
          fromHSV[1] = toHSV[1];
          fromHSV[2] = toHSV[2];
          toHSV[0] = fromHSV[0] - dH;
          toHSV[1] = fromHSV[1] - dS;
          toHSV[2] = fromHSV[2] - dV;
          dH = -dH;
          dS = -dS;
          dV = -dV;
          startMs = curMs;
        }
      }

      this._updateHSV(fromHSV[0] + ratio*dH, fromHSV[1] + ratio*dS, fromHSV[2] + ratio*dV);

      this.looperTimeout = setTimeout(looper, FADE_UPDATE_INTERVAL_MS);
    }

    if (isDefined(this.looperTimeout)) {
      clearTimeout(this.looperTimeout);
      this.looperTimeout = undefined;
    }
    looper();
  }

  private _updateHSV(h:number, s:number, v:number) {
    //console.log("BleComponent _updateHSV()");
    this.h = h;
    this.s = s;
    this.v = v;
    this.sendUpdate();
  }

  public sendUpdate() {
    if (this.dummyBLE) {
      return;
    }
    let curMs = new Date().getTime();
    //console.log("sendUpdate() requested at "+curMs);    
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
