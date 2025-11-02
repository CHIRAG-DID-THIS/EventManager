public with sharing class VendorController {
    @AuraEnabled(cacheable=true)
    public static String getEventCompanyId() {
        Id userId = UserInfo.getUserId();
        List<EventCompany__c> companies = [
            SELECT Id
            FROM EventCompany__c
            WHERE User__c = :userId
            LIMIT 1
        ];
        if (!companies.isEmpty()) {
            return companies[0].Id;
        }
        return null;
    }
}