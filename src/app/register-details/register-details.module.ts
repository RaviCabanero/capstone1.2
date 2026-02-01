import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { RegisterDetailsPageRoutingModule } from './register-details-routing.module';
import { RegisterDetailsPage } from './register-details.page';

@NgModule({
  declarations: [],
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RegisterDetailsPageRoutingModule, RegisterDetailsPage],
})
export class RegisterDetailsPageModule {}
