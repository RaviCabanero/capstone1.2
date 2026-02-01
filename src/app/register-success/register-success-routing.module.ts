import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterSuccessPage } from './register-success.page';

const routes: Routes = [
  {
    path: '',
    component: RegisterSuccessPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegisterSuccessPageRoutingModule {}
