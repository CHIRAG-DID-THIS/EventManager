public with sharing class customercart {

    /**
     * This wrapper class holds all the data needed for the cart page.
     */
    public class PackageDetailsWrapper {
        @AuraEnabled public Package__c packageRecord { get; set; }
        @AuraEnabled public Venue__c venue { get; set; }
        @AuraEnabled public EventComapny__c eventCompany { get; set; }
        @AuraEnabled public Decimal venuePrice { get; set; }
        @AuraEnabled public Decimal serviceCharge { get; set; }
        @AuraEnabled public Decimal grandTotal { get; set; }
    }
    
    /**
     * This method fetches all details for a specific package and calculates the final total.
     */
    @AuraEnabled(cacheable=true)
    public static PackageDetailsWrapper getPackageDetails(Id packageId) {
        if (packageId == null) {
            throw new AuraHandledException('Package ID is required.');
        }

         Package__c pkg = [
            SELECT Id, Name, Services__c, TotalCost__c, 
                   EventComapny__c, EventComapny__r.Company_Name__c, 
                   Venue__c, Venue__r.VenueName__c, Venue__r.Location__c
            FROM Package__c 
            WHERE Id = :packageId 
            LIMIT 1
        ];

        if (pkg == null) {
            throw new AuraHandledException('Package not found.');
        }

        PackageDetailsWrapper details = new PackageDetailsWrapper();
        details.packageRecord = pkg;
        details.venue = pkg.Venue__r;
        details.eventCompany = pkg.EventComapny__r;

        // --- Calculate Final Total ---

        // 1. Get the venue price
        Decimal venuePrice = 0;
        if (pkg.Venue__c != null && pkg.EventComapny__c != null) {
            List<Planner_Venue__c> pvLinks = [
                SELECT Price__c FROM Planner_Venue__c 
                WHERE Venue__c = :pkg.Venue__c AND EventComapny__c = :pkg.EventComapny__c 
                LIMIT 1
            ];
            if (!pvLinks.isEmpty()) {
                venuePrice = pvLinks[0].Price__c;
            }
        }
        details.venuePrice = venuePrice;
        
        // 2. Calculate subtotal
        Decimal servicesCost = pkg.TotalCost__c != null ? pkg.TotalCost__c : 0;
        Decimal subtotal = servicesCost + venuePrice;

        // 3. Calculate 8% service charge
        details.serviceCharge = subtotal * 0.08;

        // 4. Calculate grand total
        details.grandTotal = subtotal + details.serviceCharge;

        return details;
    }
}