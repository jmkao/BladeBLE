import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs/Subject';

@Injectable()
export class BleService {

  text: string;
  bleStatus: string;
  private bleStatusSource = new Subject<string>();

  bleStatusUpdate$ = this.bleStatusSource.asObservable();

  constructor() {
    console.log('Hello GlobalsComponent Component');
    this.text = 'Hello World';
    this.updateBleStatus("Pre-init");
  }

  init() {
    this.updateBleStatus("Initializing");
  }

  public updateBleStatus(newStatus: string) {
    this.bleStatus = newStatus;
    this.bleStatusSource.next(newStatus);
  }

}
