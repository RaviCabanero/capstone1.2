import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-security-rules',
  templateUrl: './security-rules.page.html',
  styleUrls: ['./security-rules.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class SecurityRulesPage implements OnInit {
  securityRules: SecurityRule[] = [
    {
      id: '1',
      name: 'Password Expiration',
      description: 'Require password reset every 90 days',
      isEnabled: true,
      severity: 'high',
    },
    {
      id: '2',
      name: 'Two-Factor Authentication',
      description: 'Enforce 2FA for all admin accounts',
      isEnabled: true,
      severity: 'critical',
    },
    {
      id: '3',
      name: 'IP Whitelist',
      description: 'Restrict login to specific IP ranges',
      isEnabled: false,
      severity: 'high',
    },
    {
      id: '4',
      name: 'Login Attempt Limit',
      description: 'Lock account after 5 failed login attempts',
      isEnabled: true,
      severity: 'medium',
    },
    {
      id: '5',
      name: 'Session Timeout',
      description: 'Auto-logout inactive sessions after 30 minutes',
      isEnabled: true,
      severity: 'medium',
    },
    {
      id: '6',
      name: 'Data Encryption',
      description: 'Encrypt sensitive user data at rest',
      isEnabled: true,
      severity: 'critical',
    },
  ];

  filteredRules: SecurityRule[] = [];
  severityFilter = 'all';
  searchTerm = '';

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.filterRules();
  }

  filterRules() {
    this.filteredRules = this.securityRules.filter(rule => {
      const matchesSearch =
        rule.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        rule.description.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesSeverity =
        this.severityFilter === 'all' || rule.severity === this.severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }

  onSearchChange() {
    this.filterRules();
  }

  onSeverityFilterChange() {
    this.filterRules();
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'tertiary';
      case 'low':
        return 'success';
      default:
        return 'primary';
    }
  }

  async toggleRule(rule: SecurityRule) {
    const action = rule.isEnabled ? 'disable' : 'enable';
    const alert = await this.alertController.create({
      header: `${action.charAt(0).toUpperCase() + action.slice(1)} Security Rule`,
      message: `Are you sure you want to ${action} "${rule.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          handler: async () => {
            await this.performToggle(rule);
          },
        },
      ],
    });
    await alert.present();
  }

  private async performToggle(rule: SecurityRule) {
    try {
      rule.isEnabled = !rule.isEnabled;
      const action = rule.isEnabled ? 'enabled' : 'disabled';
      this.showToast(`Rule "${rule.name}" ${action}`, 'success');
    } catch (error) {
      console.error('Error toggling rule:', error);
      this.showToast('Error updating rule', 'danger');
      rule.isEnabled = !rule.isEnabled;
    }
  }

  async editRule(rule: SecurityRule) {
    const alert = await this.alertController.create({
      header: 'Edit Security Rule',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Rule Name',
          value: rule.name,
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description',
          value: rule.description,
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save',
          handler: (data) => {
            rule.name = data.name;
            rule.description = data.description;
            this.showToast('Rule updated successfully', 'success');
          },
        },
      ],
    });
    await alert.present();
  }

  async addNewRule() {
    const alert = await this.alertController.create({
      header: 'Add New Security Rule',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Rule Name',
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description',
        },
        {
          name: 'severity',
          type: 'text',
          placeholder: 'Severity (critical/high/medium/low)',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Add',
          handler: (data) => {
            if (data.name && data.description && data.severity) {
              const newRule: SecurityRule = {
                id: Date.now().toString(),
                name: data.name,
                description: data.description,
                isEnabled: true,
                severity: data.severity as 'critical' | 'high' | 'medium' | 'low',
              };
              this.securityRules.push(newRule);
              this.filterRules();
              this.showToast('Rule added successfully', 'success');
            } else {
              this.showToast('Please fill all fields', 'warning');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
