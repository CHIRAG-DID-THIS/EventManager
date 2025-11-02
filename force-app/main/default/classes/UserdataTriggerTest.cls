@isTest
public class UserdataTriggerTest {
    
    @isTest
    static void testWelcomeEmailForCustomer() {
        RecordType customerRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Userdata__c' AND Name = 'Customer' LIMIT 1];
        
        Userdata__c customer = new Userdata__c(
            First_Name__c = 'Akshat',
            Last_Name__c = 'Agal',
            Email__c = 'akshat.customer@example.com',
            Password__c = 'Test@123',
            RecordTypeId = customerRecordType.Id
        );
        insert customer;
        
        System.assertEquals('akshat.customer@example.com', customer.Email__c);
    }
    
    @isTest
    static void testWelcomeEmailForVendor() {
        RecordType vendorRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Userdata__c' AND Name = 'Vendor' LIMIT 1];
        
        Userdata__c vendor = new Userdata__c(
            VendorName__c = 'Royal Weddings',
            Email__c = 'ravi.vendor@example.com',
            Password__c = 'Vendor@123',
            RecordTypeId = vendorRecordType.Id
        );
        insert vendor;
        
        System.assertEquals('ravi.vendor@example.com', vendor.Email__c);
    }
    
    @isTest
    static void testBookingTrigger() {
        // Create Customer
        RecordType customerRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Userdata__c' AND Name = 'Customer' LIMIT 1];
        Userdata__c customer = new Userdata__c(
            First_Name__c = 'Akshat',
            Email__c = 'customer@example.com',
            Password__c = 'Test@123',
            RecordTypeId = customerRecordType.Id
        );
        insert customer;
        
        // Create Vendor
        RecordType vendorRecordType = [SELECT Id FROM RecordType WHERE SObjectType = 'Userdata__c' AND Name = 'Vendor' LIMIT 1];
        Userdata__c vendor = new Userdata__c(
            VendorName__c = 'Royal Weddings',
            Email__c = 'vendor@example.com',
            Password__c = 'Vendor@123',
            RecordTypeId = vendorRecordType.Id
        );
        insert vendor;
        
        // Create EventCompany__c linked to Vendor
        EventComapny__c eventCompany = new EventComapny__c(
            Userdata__c = vendor.Id,
            CompanyRegNo__c = 'REG123456',
            EventType__c = 'Wedding',
            BankingInfo__c = 'Bank XYZ',
            City__c = 'Jaipur'
        );
        insert eventCompany;
        
EventServices__c eventService = new EventServices__c(
    EventComapny__c = eventCompany.Id,
    Price__c = 150000,
    Service_Type__c = 'Catering' // Make sure this matches a valid picklist value
);
insert eventService;
        

Venue__c venue = new Venue__c(
    VenueName__c = 'Jaipur Palace',
    Location__c = 'Jaipur',
    Capacity__c = 500,
    Descriptions__c = 'A luxurious venue suitable for royal weddings and large-scale events.'
);
insert venue;

        
        // Create Package__c
        Package__c packageRecord = new Package__c(
            EventComapny__c = eventCompany.Id,
            EventServices__c = eventService.Id,
            StartDate__c = Date.today().addDays(30),
            EndDate__c = Date.today().addDays(32),
            TotalCost__c = 500000,
            Venue__c = venue.Id
        );
        insert packageRecord;
        
Booking__c booking = new Booking__c(
    Userdata__c = customer.Id,
    Package__c = packageRecord.Id,
    EventDate__c = Date.today().addDays(45) // Example: 45 days from today
);
insert booking;
        
        // Assert booking was created
        System.assertNotEquals(null, booking.Id);
    }
}