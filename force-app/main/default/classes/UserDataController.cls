public with sharing class UserDataController {

    // Method to handle new user registration
    @AuraEnabled
    public static Userdata__c registerUser(String firstName, String lastName, String email, String password, String recordTypeName) {
       

        // Check if user already exists
        List<Userdata__c> existingUsers = [SELECT Id FROM Userdata__c	 WHERE Email__c = :email];
        if (!existingUsers.isEmpty()) {
            throw new AuraHandledException('A user with this email already exists.');
        }

        // Get the Record Type ID
        Id recTypeId = Schema.SObjectType.Userdata__c.getRecordTypeInfosByName().get(recordTypeName).getRecordTypeId();

        try {
            Userdata__c newUser = new Userdata__c	(
                First_Name__c = firstName,
                Last_Name__c = lastName,
                Email__c = email,
                Password__c = password, // Insecure password storage
                RecordTypeId = recTypeId
            );
            insert newUser;
            return newUser;
        } catch (Exception e) {
            throw new AuraHandledException('An error occurred during registration: ' + e.getMessage());
        }
    }

    // Method to handle user login
  

    // Method to handle user login
    @AuraEnabled // REMOVED (cacheable=true)
    public static Userdata__c loginUser(String email, String password) {
        try {
            List<Userdata__c> users = [
                SELECT Id, First_Name__c, Last_Name__c, Email__c, RecordTypeId, RecordType.Name
                FROM Userdata__c   
                WHERE Email__c = :email AND Password__c = :password
                LIMIT 1
            ];
            if (!users.isEmpty()) {
                return users[0];
            } else {
                return null;
            }
        } catch (Exception e) {
            throw new AuraHandledException('An error occurred during login: ' + e.getMessage());
        }
    }
}