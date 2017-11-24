import { Injectable } from '@angular/core';
import { BehaviorSubject }    from 'rxjs/BehaviorSubject';

import { Pro } from '@ionic/pro';
import { BLE } from '@ionic-native/ble';

const DEVICE_NAME = "RFGLOW";
const TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const SERVICE_UUID =  "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

@Injectable()
export class BleService {

  status: string = "Pre-init";
  bleStatusSource = new BehaviorSubject<string>(this.status);

  private connectedDeviceIds:Array<string> = [];
  private device = null;

  //bleStatusUpdate$ = this.bleStatusSource.asObservable();

  constructor(private ble:BLE) {
    this.updateBleStatus("Pre-init");
  }

  init() {
    console.log("BleService init()")
    this.updateBleStatus("Initializing");
    this.ble.stopScan();
    this.connectedDeviceIds.forEach(id => {
      this.ble.disconnect(id);
    });
    this.connectedDeviceIds = [];
    this.device = null;
    this.startScan();
  }

  private startScan() {
    this.updateBleStatus("Scanning");
    this.ble.startScan([]).subscribe(
      device => this.deviceDiscoveredCallback(device),
      error => console.log("Error while BLE scanning: "+error)
    );
  }

  private pollDevice(device) {
    this.updateBleStatus("Polling Device");
    for (var i=0; i<device.characteristics.length; i++) {
      if (device.characteristics[i].service.toLowerCase() == SERVICE_UUID) {
        if (device.characteristics[i].characteristic.toLowerCase() == TX_UUID) {
          this.connectDevice(device);
          return;
        }
      }
    }
    console.log("BLE service and characteristic not found on device. Resetting.");
    this.init();
  }

  private connectDevice(device) {
    this.updateBleStatus("Connected");
    this.device = device;
  }

  private initDevice(device) {
    this.updateBleStatus("Device Found");
    this.connectedDeviceIds.push(device.id);
    this.ble.connect(device.id).subscribe(
      deviceToPoll => this.pollDevice(deviceToPoll),
      errorDevice => this.deviceDisconnectedCallback(errorDevice)
    );
  }

  deviceDisconnectedCallback(device) {
    console.log(device.id+" disconnected.")
    this.init();
  }

  deviceDiscoveredCallback(device) {
    if(device.name == DEVICE_NAME) {
      // we found what we are looking for
      this.ble.stopScan();
      this.initDevice(device);
    }
    // Ignore this device
  }


  public writeHSV(h:number, s:number, v:number) {
    if (this.device == null && this.status == "Connected") {
      console.log("BleService: device is null even though state is connected. This should never happen!");
      Pro.getApp().monitoring.log("BleService: device is null even though state is connected. This should never happen!");
      this.init();
    } else if (this.status != "Connected") {
      console.log("BleService: writeHSV() called while not connected. Initting.");
      this.init();
    }

    let payload = new Uint8Array(4);
    payload[0] = (h >> 8) & 0x00FF;
    payload[1] = h & 0x00FF;
    payload[2] = s;
    payload[3] = v;

    //console.log("Calling device with payload: "+payload[0]+", "+payload[1]+", "+payload[2]+", "+payload[3]);

    this.ble.write(this.device.id, SERVICE_UUID, TX_UUID, payload.buffer).then(
      () => {
        //console.log('BleService: Write successful')
      },
      () => {
        console.log('BleService: Error writing to device - resetting.');
        this.init();
      }
    );
  }

  private updateBleStatus(newStatus: string) {
    this.status = newStatus;
    this.bleStatusSource.next(newStatus);
  }

}
