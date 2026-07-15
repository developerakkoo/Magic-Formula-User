import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PendingApprovalPage } from './pending-approval.page';

const routes: Routes = [{ path: '', component: PendingApprovalPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PendingApprovalPageRoutingModule {}
