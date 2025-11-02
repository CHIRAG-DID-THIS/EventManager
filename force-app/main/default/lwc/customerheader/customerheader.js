import { api, LightningElement } from 'lwc';
// 1. ADDED: Import the NavigationMixin
import { NavigationMixin } from 'lightning/navigation';

// 2. UPDATED: Extend the class with NavigationMixin
export default class CustomerHeader extends NavigationMixin(LightningElement) {

    @api userId;

    handleProfileClick(event) {
        // Prevent the default link behavior
        event.preventDefault();

        // This will now work correctly
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/customerdashboard?userId=${this.userId}`
            }
        });
    }
    handleLogoClick(event) {
        // Prevent the default link behavior
        event.preventDefault();

        // This will now work correctly
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/chome?userId=${this.userId}`
            }
        });
    }
}