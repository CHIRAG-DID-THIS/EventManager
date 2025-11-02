public with sharing class VendorDashboardController {

    // --- GREETING METHOD (Unchanged) ---
    @AuraEnabled(cacheable=true)
    public static EventComapny__c getCompanyDetails(Id companyId) {
        return [
            SELECT Id, Name, Company_Name__c, Address__c, City__c, Phone__c, About__c, 
                   EventType__c, Unavailable__c, BankingInfo__c, CompanyRegNo__c
            FROM EventComapny__c 
            WHERE Id = :companyId 
            LIMIT 1
        ];
    }

    // --- VENUE MANAGEMENT ---
    @AuraEnabled(cacheable=true)
    public static List<Venue__c> searchVenues(String searchTerm) {
        String queryTerm = '%' + searchTerm + '%';
        return [
            SELECT Id, VenueName__c, Location__c, Capacity__c, Descriptions__c
            FROM Venue__c
            WHERE VenueName__c LIKE :queryTerm OR Location__c LIKE :queryTerm
            LIMIT 10
        ];
    }

    @AuraEnabled
    public static Venue__c createVenue(Venue__c newVenue) {
        insert newVenue;
        return newVenue;
    }

    @AuraEnabled
    public static Planner_Venue__c linkVenueToPlanner(Id companyId, Id venueId, Decimal price) {
        List<Planner_Venue__c> existingLinks = [
            SELECT Id FROM Planner_Venue__c
            WHERE EventComapny__c = :companyId AND Venue__c = :venueId
        ];
        if (!existingLinks.isEmpty()) {
            throw new AuraHandledException('You have already added this venue.');
        }

        Planner_Venue__c plannerVenue = new Planner_Venue__c(
            EventComapny__c = companyId,
            Venue__c = venueId,
            Price__c = price
        );
        insert plannerVenue;
        return plannerVenue;
    }

    @AuraEnabled(cacheable=true)
    public static List<Planner_Venue__c> getVendorVenues(Id companyId) {
        return [
            SELECT Id, Venue__c, Venue__r.VenueName__c, Venue__r.Location__c, 
                   Venue__r.Capacity__c, Venue__r.Descriptions__c, Price__c,
                   EventComapny__r.Company_Name__c, EventComapny__r.Address__c, 
                   EventComapny__r.City__c, EventComapny__r.Phone__c, EventComapny__r.About__c,
                   EventComapny__r.EventType__c, EventComapny__r.Unavailable__c, 
                   EventComapny__r.BankingInfo__c, EventComapny__r.CompanyRegNo__c
            FROM Planner_Venue__c 
            WHERE EventComapny__c = :companyId
        ];
    }

    // --- SERVICE MANAGEMENT ---
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getServicePicklistValues() {
        Map<String, List<String>> picklistValues = new Map<String, List<String>>();
        Schema.DescribeFieldResult fieldResult = EventServices__c.Service_Type__c.getDescribe();
        List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();
        List<String> serviceTypes = new List<String>();
        for(Schema.PicklistEntry p : ple) {
            serviceTypes.add(p.getLabel());
        }
        picklistValues.put('Service_Type__c', serviceTypes);

        Schema.DescribeFieldResult subFieldResult = EventServices__c.Service_SubType__c.getDescribe();
        List<String> allSubTypes = new List<String>();
        for (Schema.PicklistEntry p : subFieldResult.getPicklistValues()) {
            allSubTypes.add(p.getLabel());
        }
        picklistValues.put('Service_SubType__c_All', allSubTypes);

        return picklistValues;
    }

    @AuraEnabled
    public static EventServices__c createService(Id companyId, String serviceType, String serviceSubType, String price) {
        System.debug('=== APEX CREATE SERVICE DEBUG ===');
        System.debug('Company ID: ' + companyId);
        System.debug('Service Type: ' + serviceType);
        System.debug('Service Sub-Type: ' + serviceSubType);
        System.debug('Price: ' + price);
        
        Decimal priceValue = 0;
        if (String.isNotBlank(price)) {
            priceValue = Decimal.valueOf(price);
        }

        EventServices__c newService = new EventServices__c(
            EventComapny__c = companyId,
            Service_Type__c = serviceType,
            Service_SubType__c = serviceSubType,
            Price__c = priceValue
        );
        
        System.debug('New service object before insert: ' + newService);
        
        try {
            insert newService;
            System.debug('Service inserted successfully with ID: ' + newService.Id);
        } catch (Exception e) {
            System.debug('Error inserting service: ' + e.getMessage());
            System.debug('Error type: ' + e.getTypeName());
            throw e;
        }
        
        return newService;
    }

    @AuraEnabled(cacheable=true)
    public static List<EventServices__c> getVendorServices(Id companyId) {
        return [
            SELECT Id, Service_Type__c, Service_SubType__c, Price__c
            FROM EventServices__c
            WHERE EventComapny__c = :companyId
        ];
    }

    // --- AVAILABILITY & BOOKINGS ---
    @AuraEnabled
    public static Availabilty__c setUnavailability(Id venueId, Date startDate, Date endDate) {
        Availabilty__c unavailability = new Availabilty__c(
            Venue__c = venueId,
            StartDate__c = startDate,
            EndDate__c = endDate
        );
        insert unavailability;
        return unavailability;
    }

    @AuraEnabled(cacheable=true)
    public static List<Booking__c> getUpcomingBookings(Id companyId) {
        Date today = Date.today();
        return [
            SELECT Id, Name, EventDate__c, Event_End_Date__c, Total_Amount__c, Status__c,
                   Package__r.Venue__r.VenueName__c, Package__r.Services__c, 
                   Package__r.StartDate__c, Package__r.EndDate__c, Package__r.TotalCost__c
            FROM Booking__c
            WHERE Package__r.EventComapny__c = :companyId AND Event_End_Date__c >= :today
            ORDER BY EventDate__c ASC
        ];
    }

    // --- VENUE IMAGE EXTRACTION (Completely rewritten to match VenueController) ---
    public class VenueDetailWrapper {
        @AuraEnabled public Venue__c venueRecord { get; set; }
        @AuraEnabled public String heroImageUrl { get; set; }
        @AuraEnabled public List<String> galleryImageUrls { get; set; }
    }

    /**
     * COMPLETELY REWRITTEN: This method now exactly matches VenueController's implementation.
     * It properly parses the Descriptions__c field to find all image URLs using the same
     * regex pattern and HTML entity decoding as the working VenueController.
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

        // Logic to extract all image URLs from the rich text field - EXACT COPY from VenueController
        if (String.isNotBlank(venue.Descriptions__c)) {
            String richText = venue.Descriptions__c;
            Pattern imgPattern = Pattern.compile('<img[^>]+src="([^">]+)"');
            Matcher imgMatcher = imgPattern.matcher(richText);

            while (imgMatcher.find()) {
                result.galleryImageUrls.add(imgMatcher.group(1).unescapeHtml4());
            }
        }

        // Set the hero image to the first one in the gallery, or a default - EXACT COPY from VenueController
        if (!result.galleryImageUrls.isEmpty()) {
            result.heroImageUrl = result.galleryImageUrls[0];
        } else {
            // Provide a default hero image if none are found in the description
            result.heroImageUrl = 'https://images.unsplash.com/photo-1596424424564-a7a584378193?q=80&w=1920';
        }

        return result;
    }

    // --- ADDITIONAL VENUE METHODS ---
    @AuraEnabled(cacheable=true)
    public static Venue__c getVenueById(Id venueId) {
        if (venueId == null) {
            return null;
        }
        
        return [
            SELECT Id, VenueName__c, Location__c, Capacity__c, Descriptions__c, Unavailable__c
            FROM Venue__c
            WHERE Id = :venueId
            LIMIT 1
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getVenueImages(Id venueId) {
        if (venueId == null) {
            return new List<String>();
        }

        VenueDetailWrapper venueDetails = getVenueDetails(venueId);
        return venueDetails.galleryImageUrls;
    }

}