public with sharing class PackageDisplayController {

    public class PackageDetailsWrapper {
        @AuraEnabled public Package__c packageRecord { get; set; }
        @AuraEnabled public Venue__c venue { get; set; }
        @AuraEnabled public EventComapny__c eventCompany { get; set; }
        @AuraEnabled public Decimal venuePrice { get; set; }
        @AuraEnabled public Decimal serviceCharge { get; set; }
        @AuraEnabled public Decimal grandTotal { get; set; }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<PackageDetailsWrapper> getPackagesDetails(List<String> packageIds) {
        if (packageIds == null || packageIds.isEmpty()) {
            return new List<PackageDetailsWrapper>();
        }

        // UPDATED: The query now fetches all relevant fields for Venue and Event Company
        List<Package__c> packages = [
            SELECT 
                Id, Name, Services__c, TotalCost__c, 
                EventComapny__c, 
                EventComapny__r.Company_Name__c, EventComapny__r.EventType__c, 
                EventComapny__r.Phone__c, EventComapny__r.Address__c, 
                EventComapny__r.City__c, EventComapny__r.About__c, 
                EventComapny__r.Userdata__r.VendorName__c,
                Venue__c, 
                Venue__r.VenueName__c, Venue__r.Location__c, Venue__r.Capacity__c,
                Venue__r.Descriptions__c, Venue__r.Unavailable__c
            FROM Package__c 
            WHERE Id IN :packageIds
        ];

        if (packages.isEmpty()) {
            return new List<PackageDetailsWrapper>();
        }
        
        // --- The rest of the logic for calculating price and totals is correct ---

        Set<Id> venueIds = new Set<Id>();
        Set<Id> companyIds = new Set<Id>();
        for (Package__c pkg : packages) {
            if (pkg.Venue__c != null) venueIds.add(pkg.Venue__c);
            if (pkg.EventComapny__c != null) companyIds.add(pkg.EventComapny__c);
        }

        Map<String, Decimal> priceMap = new Map<String, Decimal>();
        if (!venueIds.isEmpty() && !companyIds.isEmpty()) {
            for (Planner_Venue__c pvLink : [
                SELECT Venue__c, EventComapny__c, Price__c 
                FROM Planner_Venue__c 
                WHERE Venue__c IN :venueIds AND EventComapny__c IN :companyIds
            ]) {
                String key = pvLink.Venue__c + '-' + pvLink.EventComapny__c;
                priceMap.put(key, pvLink.Price__c);
            }
        }

        List<PackageDetailsWrapper> results = new List<PackageDetailsWrapper>();
        for (Package__c pkg : packages) {
            PackageDetailsWrapper details = new PackageDetailsWrapper();
            details.packageRecord = pkg;
            details.venue = pkg.Venue__r;
            details.eventCompany = pkg.EventComapny__r;

            String priceKey = pkg.Venue__c + '-' + pkg.EventComapny__c;
            Decimal venuePrice = priceMap.containsKey(priceKey) ? priceMap.get(priceKey) : 0;
            details.venuePrice = venuePrice;
            
            Decimal servicesCost = pkg.TotalCost__c != null ? pkg.TotalCost__c : 0;
            Decimal subtotal = servicesCost + venuePrice;
            // NOTE: Using 10% service charge as last discussed
            details.serviceCharge = subtotal * 0.10; 
            details.grandTotal = subtotal + details.serviceCharge;

            results.add(details);
        }

        return results;
    }
}