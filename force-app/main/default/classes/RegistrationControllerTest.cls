@isTest
private class RegistrationControllerTest {

    // == HELPER METHOD: Mimic password creation for test data ==
    // This helper is still useful for creating valid user data for our tests.
    private static UserData__c createTestUser(String firstName, String lastName, String email, String password, String recordTypeName) {
        // CORRECTED: Get the Record Type ID here, assuming it exists in the org.
        Id rtId = Schema.SObjectType.UserData__c.getRecordTypeInfosByName().get(recordTypeName).getRecordTypeId();
        
        Blob saltBlob = Crypto.generateAesKey(128);
        String salt = EncodingUtil.convertToHex(saltBlob);
        Blob dataToHash = Blob.valueOf(password + salt);
        Blob hashedPassword = Crypto.generateDigest('SHA-256', dataToHash);
        String hashedPasswordHex = EncodingUtil.convertToHex(hashedPassword);

        return new UserData__c(
            First_Name__c = firstName,
            Last_Name__c = lastName,
            Email__c = email,
            RecordTypeId = rtId,
            Password__c = hashedPasswordHex,
            Salt__c = salt
        );
    }

    // ===================================================================
    // == LOGIN METHOD TESTS
    // ===================================================================

    @isTest
    static void testLoginSuccessCustomer() {
        String testPassword = 'Password123!';
        UserData__c customer = createTestUser('Test', 'Customer', 'customer@test.com', testPassword, 'Customer');
        insert customer;

        Test.startTest();
        String result = RegistrationController.login('customer@test.com', testPassword);
        Test.stopTest();

        System.assertEquals('login_success:customer:' + customer.Id, result);
    }

    @isTest
    static void testLoginSuccessVendorWithCompany() {
        String testPassword = 'Password123!';
        UserData__c vendor = createTestUser('Test', 'Vendor', 'vendor@test.com', testPassword, 'Vendor');
        insert vendor;

        // CORRECTED: Removed assignment to the Name field.
        // Populate any other required, *writable* fields your object may have.
        EventComapny__c company = new EventComapny__c(Userdata__c = vendor.Id);
        insert company;

        Test.startTest();
        String result = RegistrationController.login('vendor@test.com', testPassword);
        Test.stopTest();

        System.assertEquals('login_success:vendor:' + company.Id, result);
    }
    
    // ... (Other login tests remain the same as they are correct) ...
     @isTest
    static void testLoginSuccessVendorWithoutCompany() {
        String testPassword = 'Password123!';
        UserData__c vendor = createTestUser('Test', 'Vendor', 'vendor2@test.com', testPassword, 'Vendor');
        insert vendor;

        Test.startTest();
        String result = RegistrationController.login('vendor2@test.com', testPassword);
        Test.stopTest();

        System.assertEquals('login_success:vendor_no_company:' + vendor.Id, result);
    }

    @isTest
    static void testLoginFailureInvalidPassword() {
        String testPassword = 'Password123!';
        UserData__c customer = createTestUser('Test', 'Customer', 'customer@test.com', testPassword, 'Customer');
        insert customer;
        
        Test.startTest();
        String result = RegistrationController.login('customer@test.com', 'WrongPassword!');
        Test.stopTest();
        
        System.assertEquals('Error: Invalid username or password.', result);
    }

    // ===================================================================
    // == REGISTER USER METHOD TESTS
    // ===================================================================

    @isTest
    static void testRegisterUserSuccessCustomer() {
        Test.startTest();
        String result = RegistrationController.registerUser('Jane', 'Doe', 'jane.doe@test.com', 'MySecurePass#1', 'Customer', '9876543210', null);
        Test.stopTest();

        System.assertEquals('success', result);
        System.assertEquals(1, [SELECT COUNT() FROM UserData__c WHERE Email__c = 'jane.doe@test.com']);
    }

    @isTest
    static void testRegisterUserSuccessVendor() {
        Test.startTest();
        String result = RegistrationController.registerUser('John', 'Smith', 'john.smith@test.com', 'MyVendorPass#1', 'Vendor', '1234567890', 'Johns Events');
        Test.stopTest();

        System.assert(result.startsWith('vendor_success:'));
    }

    @isTest
    static void testRegisterUserFailureDuplicateEmail() {
        RegistrationController.registerUser('Jane', 'Doe', 'duplicate@test.com', 'MySecurePass#1', 'Customer', '9876543210', null);

        Test.startTest();
        String result = RegistrationController.registerUser('Another', 'Person', 'duplicate@test.com', 'OtherPass!', 'Vendor', '111222333', 'AP Events');
        Test.stopTest();

        System.assertEquals('Error: An account with this email address already exists.', result);
    }
    
    // ===================================================================
    // == CREATE EVENT COMPANY METHOD TESTS
    // ===================================================================

    @isTest
    static void testCreateEventCompanySuccess() {
        UserData__c vendor = createTestUser('Vendor', 'User', 'company.owner@test.com', 'pass123', 'Vendor');
        insert vendor;

        // CORRECTED: Removed Name field assignment.
        EventComapny__c newCompany = new EventComapny__c(
            Userdata__c = vendor.Id
            // Add other writable fields here if necessary
        );

        Test.startTest();
        String result = RegistrationController.createEventCompany(newCompany);
        Test.stopTest();

        System.assert(result.startsWith('success:'), 'Expected a success message with the new company ID.');
        System.assertEquals(1, [SELECT COUNT() FROM EventComapny__c WHERE Userdata__c = :vendor.Id]);
    }

    @isTest
    static void testCreateEventCompanyFailureMissingUser() {
        // CORRECTED: Removed Name field assignment.
        EventComapny__c newCompany = new EventComapny__c(); // Userdata__c is intentionally left null
        
        Test.startTest();
        String result = RegistrationController.createEventCompany(newCompany);
        Test.stopTest();
        
        System.assertEquals('Error: Userdata ID is missing. Cannot link company to a user.', result);
        System.assertEquals(0, [SELECT COUNT() FROM EventComapny__c]);
    }
}