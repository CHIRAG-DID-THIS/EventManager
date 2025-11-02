public with sharing class VenueSearchController {

    /**
     * @description Finds available venues based on search criteria.
     * @param location A string to search for in the Venue's Location or Name field.
     * @param eventDate The desired date for the event.
     * @param capacity The required capacity for the venue.
     * @return A list of matching Venue__c records.
     */
    @AuraEnabled(cacheable=true)
    public static List<Venue__c> findVenues(String location, Date eventDate, Integer capacity) {
        // Prepare the search string for a 'LIKE' query
        String locationQuery = '%' + String.escapeSingleQuotes(location) + '%';
        
        // Find all venues that are explicitly marked as UNAVAILABLE on the event date.
        Set<Id> unavailableVenueIds = new Set<Id>();
        if (eventDate != null) {
            // This query finds any availability block that overlaps with the selected date.
            List<Availabilty__c> unavailableSlots = [
                SELECT Venue__c
                FROM Availabilty__c 
                WHERE StartDate__c <= :eventDate AND EndDate__c >= :eventDate
            ];
            
            for (Availabilty__c slot : unavailableSlots) {
                if (slot.Venue__c != null) {
                    unavailableVenueIds.add(slot.Venue__c);
                }
            }
        }
        
        // The main query finds venues that meet the location and capacity criteria,
        // and crucially, are NOT in the set of unavailable venues for that date.
        return [
            SELECT Id, Name, VenueName__c, Location__c, Descriptions__c, Capacity__c 
            FROM Venue__c
            WHERE (VenueName__c LIKE :locationQuery OR Location__c LIKE :locationQuery)
            AND Capacity__c >= :capacity
            AND Id NOT IN :unavailableVenueIds
            ORDER BY Name
        ];
    }
}