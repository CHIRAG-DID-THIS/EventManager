import { LightningElement, api } from 'lwc';

export default class CustomerVenueSearch extends LightningElement {
    @api venues = [];

    handleVenueSelect(event) {
        const venueId = event.currentTarget.dataset.id;
        
        // This creates and sends the 'venueselected' event to the parent
        const selectEvent = new CustomEvent('venueselected', {
            detail: { venueId: venueId },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(selectEvent);
    }
}