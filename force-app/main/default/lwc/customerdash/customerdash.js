import { LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getDashboardData from '@salesforce/apex/DashboardController.getDashboardData';

export default class CustomerDash extends LightningElement {
    userId;
    dashboardData;
    error;
    isLoading = true;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.userId = currentPageReference.state.userId;
            // ADDED: Log to check the userId from the URL
            console.log('Dashboard: userId from URL is ->', this.userId);
        }
    }

    @wire(getDashboardData, { userdataId: '$userId' })
    wiredDashboardData({ error, data }) {
        if (data) {
            // ADDED: Log to see the data returned from Apex
            console.log('Dashboard: Wire service returned data ->', JSON.parse(JSON.stringify(data)));
            this.dashboardData = data;
            this.error = undefined;
        } else if (error) {
            // ADDED: Log to see any errors from Apex
            console.error('Dashboard: Wire service returned an error ->', error);
            this.error = error;
            this.dashboardData = undefined;
        }
        this.isLoading = false;
    }

    get profile() {
        return this.dashboardData ? this.dashboardData.userProfile : {};
    }

    get bookings() {
        return this.dashboardData ? this.dashboardData.bookings : [];
    }

    get hasBookings() {
        return this.bookings && this.bookings.length > 0;
    }
}