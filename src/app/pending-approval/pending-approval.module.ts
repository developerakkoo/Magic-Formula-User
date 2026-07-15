import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PendingApprovalPageRoutingModule } from './pending-approval-routing.module';
import { PendingApprovalPage } from './pending-approval.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    PendingApprovalPageRoutingModule
  ],
  declarations: [PendingApprovalPage]
})
export class PendingApprovalPageModule {}
