public with sharing class customervenuesearch {

    public class VenueWrapper {
        @AuraEnabled public Id venueId { get; set; }
        @AuraEnabled public String venueName { get; set; }
        @AuraEnabled public String location { get; set; }
        @AuraEnabled public Decimal capacity { get; set; }
        @AuraEnabled public String imageUrl { get; set; }

        public VenueWrapper(Venue__c v) {
            this.venueId = v.Id;
            this.venueName = v.VenueName__c;
            this.location = v.Location__c;
            this.capacity = v.Capacity__c;
            
            // --- Logic to extract the first image URL from the rich text field ---
            if (String.isNotBlank(v.Descriptions__c)) {
                String richText = v.Descriptions__c;
                Pattern imgPattern = Pattern.compile('<img[^>]+src="([^">]+)"');
                Matcher imgMatcher = imgPattern.matcher(richText);

                if (imgMatcher.find()) {
                    // If an image is found, use its URL
                    this.imageUrl = imgMatcher.group(1).unescapeHtml4();
                } else {
                    // Fallback if no image is in the description
                    this.imageUrl = ''; // Or path to a default static resource
                }
            } else {
                this.imageUrl = ''; // Or path to a default static resource
            }
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<VenueWrapper> findVenues(String location, Date startDate, Date endDate) {
        
        String searchKey = '%' + location + '%';
        // UPDATED: The query now includes the Descriptions__c field
        List<Venue__c> potentialVenues = [
            SELECT Id, VenueName__c, Location__c, Capacity__c, Descriptions__c 
            FROM Venue__c 
            WHERE Location__c LIKE :searchKey AND Unavailable__c = false
            LIMIT 50
        ];

        if (potentialVenues.isEmpty()) {
            return new List<VenueWrapper>();
        }

        List<Venue__c> availableVenues = new List<Venue__c>();

        if (startDate != null && endDate != null) {
            Set<Id> bookedVenueIds = new Set<Id>();
            for (Availabilty__c booking : [
                SELECT Venue__c 
                FROM Availabilty__c 
                WHERE Venue__c IN :potentialVenues 
                  AND StartDate__c <= :endDate 
                  AND EndDate__c >= :startDate
            ]) {
                bookedVenueIds.add(booking.Venue__c);
            }

            for (Venue__c venue : potentialVenues) {
                if (!bookedVenueIds.contains(venue.Id)) {
                    availableVenues.add(venue);
                }
            }
        } else {
            availableVenues = potentialVenues;
        }

        // SIMPLIFIED: The wrapping logic is now handled entirely by the constructor
        List<VenueWrapper> results = new List<VenueWrapper>();
        for (Venue__c venue : availableVenues) {
            results.add(new VenueWrapper(venue));
        }

        return results;
    }
}