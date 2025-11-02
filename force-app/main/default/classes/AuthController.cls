public with sharing class AuthController {
    
    @AuraEnabled
    public static String registerUser(String userType, String firstName, String lastName, String email, String contactNo, String password, String vendorName) {
        Id recordTypeId = Schema.SObjectType.Userdata__c.getRecordTypeInfosByName().get(userType).getRecordTypeId();

        Userdata__c newUser = new Userdata__c(
            First_Name__c = firstName,
            Last_Name__c = lastName,
            Email__c = email,
            Contact_No__c = Decimal.valueOf(contactNo),
            RecordTypeId = recordTypeId
        );
        

        if (userType == 'Vendor') {
            newUser.VendorName__c = vendorName;
        }

        insert newUser;
        return 'Success';
    }

    @AuraEnabled
    public static String loginUser(String userType, String email, String password) {
        Id recordTypeId = Schema.SObjectType.Userdata__c.getRecordTypeInfosByName().get(userType).getRecordTypeId();

        List<Userdata__c> users = [
            SELECT Id FROM Userdata__c 
            WHERE Email__c = :email 
            // AND Password__c = :password 
            AND RecordTypeId = :recordTypeId 
            LIMIT 1
        ];

        return users.isEmpty() ? 'Failed' : 'Success';
    }
}