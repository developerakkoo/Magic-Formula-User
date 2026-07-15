import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RegistrationRejectedPage } from './registration-rejected.page';

const routes: Routes = [{ path: '', component: RegistrationRejectedPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegistrationRejectedPageRoutingModule {}
