public with sharing class RegistrationController {

    @AuraEnabled
    public static String login(String username, String password) {
        if (String.isBlank(username) || String.isBlank(password)) {
            return 'Error: Invalid username or password.';
        }

        List<UserData__c> potentialUsers = [
            SELECT Id, RecordType.Name, Password__c, Salt__c 
            FROM UserData__c
            WHERE Email__c = :username
            LIMIT 1
        ];

        if (!potentialUsers.isEmpty()) {
            UserData__c foundUser = potentialUsers[0];
            String storedSalt = foundUser.Salt__c;
            String storedHash = foundUser.Password__c;

            if (String.isBlank(storedSalt) || String.isBlank(storedHash)) {
                return 'Error: User account is not configured for secure login.';
            }

            // 1. Combine the incoming password attempt with the user's stored salt
            Blob dataToHash = Blob.valueOf(password + storedSalt);
            
            // 2. Hash it using the same SHA-256 algorithm
            Blob newHash = Crypto.generateDigest('SHA-256', dataToHash);
            String newHashAsHex = EncodingUtil.convertToHex(newHash);

            // 3. Compare the new hash with the hash stored in the database
            if (newHashAsHex == storedHash) {
                // --- Passwords Match: Login successful ---
                String userRecordType = foundUser.RecordType.Name;
                if (userRecordType == 'Vendor') {
                    List<EventComapny__c> companies = [SELECT Id FROM EventComapny__c WHERE Userdata__c = :foundUser.Id LIMIT 1];
                    if (!companies.isEmpty()) {
                        return 'login_success:vendor:' + companies[0].Id;
                    } else {
                        return 'login_success:vendor_no_company:' + foundUser.Id;
                    }
                } else {
                    return 'login_success:customer:' + foundUser.Id;
                }
            }
        }
        return 'Error: Invalid username or password.';
    }

    @AuraEnabled
    public static String registerUser(String firstName, String lastName, String email, String password, String recordTypeName, String contactNo, String vendorName) {
        Savepoint sp = Database.setSavepoint();
        try {
            if ([SELECT COUNT() FROM UserData__c WHERE Email__c = :email] > 0) {
                return 'Error: An account with this email address already exists.';
            }

            // 1. Generate a unique, random salt for this user
            Blob saltBlob = Crypto.generateAesKey(128);
            String salt = EncodingUtil.convertToHex(saltBlob);

            // 2. Combine the plain-text password and the salt
            Blob dataToHash = Blob.valueOf(password + salt);

            // 3. Create a one-way hash using SHA-256
            Blob hashedPassword = Crypto.generateDigest('SHA-256', dataToHash);
            String hashedPasswordHex = EncodingUtil.convertToHex(hashedPassword);
            
            Id recordTypeId = Schema.SObjectType.UserData__c.getRecordTypeInfosByName().get(recordTypeName).getRecordTypeId();
            
            UserData__c userData = new UserData__c(
                RecordTypeId = recordTypeId, First_Name__c = firstName, Last_Name__c = lastName,
                Email__c = email, Contact_No__c = String.isNotBlank(contactNo) ? Decimal.valueOf(contactNo) : null,
                VendorName__c = vendorName,
                Password__c = hashedPasswordHex, // Store the HASH
                Salt__c = salt                  // Store the SALT
            );
            insert userData;

            if (recordTypeName == 'Vendor') {
                return 'vendor_success:' + userData.Id;
            }
            return 'success';

        } catch (Exception e) {
            Database.rollback(sp);
            return 'A system error occurred: ' + e.getMessage();
        }
    }
    
    @AuraEnabled
    public static String createEventCompany(EventComapny__c companyRecord) {
        try {
            if (companyRecord.Userdata__c == null) {
                return 'Error: Userdata ID is missing. Cannot link company to a user.';
            }
            insert companyRecord;
            return 'success:' + companyRecord.Id;
        } catch (Exception e) {
            return 'An error occurred while creating the company profile: ' + e.getMessage();
        }
    }
}