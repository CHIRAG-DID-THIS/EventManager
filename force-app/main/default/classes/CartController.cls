public with sharing class CartController {
    /**
     * @description Returns the current user's open cart, creating one if it doesn't exist.
     */
    @AuraEnabled
    public static Cart__c getOrCreateCart() {
        Id userId = UserInfo.getUserId();
        List<Cart__c> carts = [
            SELECT Id, Name, Status__c, User__c
            FROM Cart__c
            WHERE User__c = :userId AND Status__c = 'Open'
            LIMIT 1
        ];
        if (!carts.isEmpty()) {
            return carts[0];
        }
        Cart__c newCart = new Cart__c();
        newCart.User__c = userId;
        newCart.Status__c = 'Open';
        insert newCart;
        return newCart;
    }

    /**
     * @description Adds a service to the user's cart or updates quantity if it already exists.
     * @param serviceId The EventServices__c Id
     * @param quantity The quantity to add (default 1)
     */
    @AuraEnabled
    public static Id addItem(Id serviceId, Integer quantity) {
        if (serviceId == null) {
            throw new AuraHandledException('Service Id is required');
        }
        if (quantity == null || quantity <= 0) {
            quantity = 1;
        }
        Cart__c cart = getOrCreateCart();

        // Get service details for pricing
        EventServices__c svc = [SELECT Id, Price__c FROM EventServices__c WHERE Id = :serviceId LIMIT 1];

        // Check if existing item exists
        List<Cart_Item__c> existing = [
            SELECT Id, Quantity__c, UnitPrice__c
            FROM Cart_Item__c
            WHERE Cart__c = :cart.Id AND Service__c = :serviceId
            LIMIT 1
        ];
        if (!existing.isEmpty()) {
            Cart_Item__c item = existing[0];
            item.Quantity__c = (item.Quantity__c != null ? item.Quantity__c : 0) + quantity;
            update item;
            return item.Id;
        }
        Cart_Item__c newItem = new Cart_Item__c();
        newItem.Cart__c = cart.Id;
        newItem.Service__c = serviceId;
        newItem.Quantity__c = quantity;
        newItem.UnitPrice__c = svc.Price__c;
        insert newItem;
        return newItem.Id;
    }

    /**
     * @description Returns cart items for the current user's open cart with totals.
     */
    @AuraEnabled(cacheable=true)
    public static List<Cart_Item__c> getItems() {
        Cart__c cart = getOrCreateCart();
        return [
            SELECT Id, Cart__c, Service__c, Quantity__c, UnitPrice__c
            FROM Cart_Item__c
            WHERE Cart__c = :cart.Id
        ];
    }
}