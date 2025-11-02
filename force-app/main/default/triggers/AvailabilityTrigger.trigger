trigger AvailabilityTrigger on Availabilty__c (after insert, after update) {
    VenueAvailabilityChecker.updateVenueAvailability();
}