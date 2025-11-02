public with sharing class VenueController {

    // NEW: Wrapper class to hold the venue and its extracted images
    public class VenueDetailWrapper {
        @AuraEnabled public Venue__c venueRecord { get; set; }
        @AuraEnabled public String heroImageUrl { get; set; }
        @AuraEnabled public List<String> galleryImageUrls { get; set; }
    }

    /**
     * UPDATED: This method now returns the new wrapper class.
     * It parses the Descriptions__c field to find all image URLs.
     */
    @AuraEnabled(cacheable=true)
    public static VenueDetailWrapper getVenueDetails(Id venueId) {
        if (venueId == null) {
            throw new AuraHandledException('Venue ID is required.');
        }

        Venue__c venue = [
            SELECT Id, VenueName__c, Location__c, Capacity__c, Descriptions__c, Unavailable__c
            FROM Venue__c
            WHERE Id = :venueId
            LIMIT 1
        ];
        
        VenueDetailWrapper result = new VenueDetailWrapper();
        result.venueRecord = venue;
        result.galleryImageUrls = new List<String>();

        // Logic to extract all image URLs from the rich text field
        if (String.isNotBlank(venue.Descriptions__c)) {
            String richText = venue.Descriptions__c;
            System.debug('=== VENUE IMAGE EXTRACTION DEBUG ===');
            System.debug('Venue ID: ' + venueId);
            System.debug('Raw Descriptions field content: ' + richText);
            
            Pattern imgPattern = Pattern.compile('<img[^>]+src="([^">]+)"');
            Matcher imgMatcher = imgPattern.matcher(richText);

            while (imgMatcher.find()) {
                String extractedUrl = imgMatcher.group(1).unescapeHtml4();
                System.debug('Extracted image URL: ' + extractedUrl);
                result.galleryImageUrls.add(extractedUrl);
            }
            
            System.debug('Total images extracted: ' + result.galleryImageUrls.size());
            System.debug('Gallery URLs: ' + result.galleryImageUrls);
        } else {
            System.debug('=== VENUE IMAGE EXTRACTION DEBUG ===');
            System.debug('Venue ID: ' + venueId);
            System.debug('Descriptions field is blank or null');
        }

        // Set the hero image to the first one in the gallery, or a default
        if (!result.galleryImageUrls.isEmpty()) {
            result.heroImageUrl = result.galleryImageUrls[0];
        } else {
            // Provide a default hero image if none are found in the description
            result.heroImageUrl = 'https://images.unsplash.com/photo-1596424424564-a7a584378193?q=80&w=1920';
        }

        return result;
    }

    // getPlannerVenueLinks method remains unchanged
    @AuraEnabled(cacheable=true)
public static List<Planner_Venue__c> getPlannerVenueLinks(Id venueId) {
    return [
        SELECT 
            Id, Price__c, EventComapny__c, 
            EventComapny__r.Company_Name__c, 
            EventComapny__r.EventType__c,   // ADDED
            EventComapny__r.City__c         // ADDED
        FROM Planner_Venue__c
        WHERE Venue__c = :venueId
    ];
}
}