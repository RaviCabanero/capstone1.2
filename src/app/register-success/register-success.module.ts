import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { RegisterSuccessPageRoutingModule } from './register-success-routing.module';
import { RegisterSuccessPage } from './register-success.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, RegisterSuccessPageRoutingModule, RegisterSuccessPage],
})
export class RegisterSuccessPageModule {}
