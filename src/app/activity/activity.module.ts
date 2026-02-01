import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivityPageRoutingModule } from './activity-routing.module';
import { ActivityPage } from './activity.page';

@NgModule({
  imports: [ActivityPageRoutingModule, ActivityPage],
})
export class ActivityPageModule {}
