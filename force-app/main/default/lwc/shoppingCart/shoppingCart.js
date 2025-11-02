import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getItems from '@salesforce/apex/CartController.getItems';
import createBookingFromCart from '@salesforce/apex/BookingController.createBookingFromCart';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ShoppingCart extends NavigationMixin(LightningElement) {
    @track items = [];
    @track rows = [];
    @track eventDate = '';

    columns = [
        { label: 'Service', fieldName: 'Service__c', type: 'text' },
        { label: 'Quantity', fieldName: 'Quantity__c', type: 'number' },
        { label: 'Unit Price', fieldName: 'UnitPrice__c', type: 'currency' },
        { label: 'Line Total', fieldName: 'lineTotal', type: 'currency' }
    ];

    connectedCallback() {
        this.loadItems();
    }

    async loadItems() {
        try {
            const data = await getItems();
            this.items = data || [];
            this.rows = this.items.map(i => ({
                ...i,
                lineTotal: (i.Quantity__c || 0) * (i.UnitPrice__c || 0)
            }));
        } catch (e) {
            this.toast('Error', 'Failed to load cart items', 'error');
        }
    }

    get formattedTotal() {
        const total = (this.rows || []).reduce((sum, r) => sum + (r.lineTotal || 0), 0);
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
    }

    get disableBooking() {
        return !(this.items && this.items.length) || !this.eventDate;
    }

    handleDate(event) {
        this.eventDate = event.target.value;
    }

    async proceedToBooking() {
        try {
            const bookingId = await createBookingFromCart({ eventDate: this.eventDate });
            this.toast('Success', `Booking created (${bookingId})`, 'success');
            // Navigate to the Booking record page
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: bookingId,
                    objectApiName: 'Booking__c',
                    actionName: 'view'
                }
            });
        } catch (e) {
            let message = e?.body?.message || 'Unknown error';
            this.toast('Error', message, 'error');
        }
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}