import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RegistrationRejectedPageRoutingModule } from './registration-rejected-routing.module';
import { RegistrationRejectedPage } from './registration-rejected.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RegistrationRejectedPageRoutingModule
  ],
  declarations: [RegistrationRejectedPage]
})
export class RegistrationRejectedPageModule {}
