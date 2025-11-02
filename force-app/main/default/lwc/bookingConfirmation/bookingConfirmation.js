import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getBookingSummary from '@salesforce/apex/BookingController.getBookingSummary';
import confirmPayment from '@salesforce/apex/BookingController.confirmPayment';
import { CurrentPageReference } from 'lightning/navigation';

export default class BookingConfirmation extends NavigationMixin(LightningElement) {
    @api recordId; // when placed on Booking record page
    @track bookingId;
    @track loaded = false;
    @track loading = false;
    @track items = [];
    @track status;
    @track eventDate;
    @track total = 0;
    @track transactionId = '';
    @track paymentMethod = 'Card';

    columns = [
        { label: 'Service', fieldName: 'Service__c', type: 'text' },
        { label: 'Qty', fieldName: 'Quantity__c', type: 'number' },
        { label: 'Unit Price', fieldName: 'UnitPrice__c', type: 'currency' },
        { label: 'Line Total', fieldName: 'LineTotal', type: 'currency' }
    ];

    paymentOptions = [
        { label: 'Card', value: 'Card' },
        { label: 'Stripe', value: 'Stripe' },
        { label: 'PayPal', value: 'PayPal' }
    ];

    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        if (pageRef && pageRef.state) {
            const idParam = pageRef.state.recordId || pageRef.state.bookingId;
            if (idParam && !this.bookingId) {
                this.bookingId = idParam;
                this.init();
            }
        }
    }

    connectedCallback() {
        if (this.recordId && !this.bookingId) {
            this.bookingId = this.recordId;
            this.init();
        }
    }

    get formattedTotal() {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(this.total || 0);
    }

    async init() {
        try {
            const summary = await getBookingSummary({ bookingId: this.bookingId });
            this.status = summary.Status__c;
            this.eventDate = summary.EventDate__c;
            this.items = (summary.Items || []).map((row, index) => ({ ...row, index }));
            this.total = summary.Total_Amount__c || 0;
            this.loaded = true;
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }
    }

    handleTxnChange(event) {
        this.transactionId = event.target.value;
    }

    handleMethodChange(event) {
        this.paymentMethod = event.detail.value;
    }

    async handleConfirm() {
        if (!this.bookingId) {
            this.showToast('Error', 'Missing booking Id', 'error');
            return;
        }
        this.loading = true;
        try {
            await confirmPayment({ bookingId: this.bookingId, transactionId: this.transactionId, paymentMethod: this.paymentMethod });
            this.showToast('Success', 'Payment confirmed and booking updated', 'success');
            this.navigateToBooking();
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.loading = false;
        }
    }

    navigateToBooking() {
        if (!this.bookingId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.bookingId,
                objectApiName: 'Booking__c',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    normalizeError(error) {
        if (!error) return 'Unknown error';
        if (Array.isArray(error.body)) {
            return error.body.map(e => e.message).join(', ');
        } else if (typeof error.body?.message === 'string') {
            return error.body.message;
        }
        return error.message || 'Unknown error';
    }
}