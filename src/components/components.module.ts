import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BleComponent } from './ble/ble';

@NgModule({
	declarations: [BleComponent],
	imports: [CommonModule],
	exports: [BleComponent]
})
export class ComponentsModule {}
