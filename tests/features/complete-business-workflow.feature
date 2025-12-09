Feature: Complete Invoice Lifecycle Management
  As a freelancer using QuoteFlow
  I want to manage the complete lifecycle from quote to paid invoice
  So that I can efficiently handle my business operations

  Background:
    Given I am logged in as "test@example.com"
    And I am on the dashboard

  Scenario: Complete business workflow from company setup to invoice archival
    # Company Setup
    Given I navigate to the companies page
    When I create a new company with the following details:
      | name    | Acme Consulting Ltd         |
      | email   | info@acmeconsulting.com     |
      | phone   | +1-555-0100                 |
      | street  | 789 Business Blvd           |
      | city    | San Francisco               |
      | state   | CA                          |
      | zip     | 94102                       |
      | country | USA                         |
    Then I should see the company "Acme Consulting Ltd" in the companies list

    # Template Setup
    When I select the company "Acme Consulting Ltd"
    And I navigate to the template settings
    And I create a new invoice template with the following details:
      | name         | Professional Invoice Template    |
      | headerColor  | #3B82F6                          |
      | footerText   | Thank you for your business!     |
    Then I should see the template "Professional Invoice Template" in the templates list

    # Customer Creation
    Given I navigate to the customers page
    When I create a new customer with the following details:
      | name   | Jane Smith                |
      | email  | jane.smith@example.com    |
      | phone  | +1-555-0200               |
      | street | 456 Client Street         |
      | city   | Los Angeles               |
      | state  | CA                        |
      | zip    | 90001                     |
    Then I should see the customer "Jane Smith" in the customers list

    # Quote Creation
    Given I navigate to the create quote page
    When I create a quote with the following details:
      | customer    | Jane Smith                                            |
      | title       | Website Redesign Project                              |
      | description | Complete website redesign with modern UI/UX           |
      | quantity    | 1                                                     |
      | price       | 8000                                                  |
      | taxRate     | 8.5                                                   |
      | notes       | Includes 3 rounds of revisions and 30 days of support |
    Then I should be on the quote details page
    And I should see the quote title "Website Redesign Project"

    # Quote Public View
    When I view the quote in public view
    Then I should see the quote details for "Jane Smith"
    And I should see the total amount "$8,680.00"

    # Quote Approval
    When I return to the quote details page
    And I click the "Approve" button
    Then I should see the status "Approved"

    # Convert to Invoice
    When I click the "Convert to Invoice" button
    And I confirm the conversion
    Then I should be redirected to the invoice details page
    And I should see the invoice for "Website Redesign Project"

    # Invoice Public View
    When I view the invoice in public view
    Then I should see the invoice details for "Jane Smith"
    And I should see the invoice amount "$8,680.00"
    And I should see the payment options

    # Invoice Approval
    When I return to the invoice details page
    And I approve the invoice
    Then I should see the invoice status "Approved"

    # Invoice Payment
    When I record a payment for the invoice using "credit_card"
    Then I should see the invoice status "Paid"
    And I should see the payment confirmation

    # Invoice Archival
    When I archive the invoice
    Then I should see the archive confirmation

    # Verify Archived Invoice
    When I navigate to the archived invoices page
    Then I should see the invoice "Website Redesign Project" in the archived list
    And I should be able to view the archived invoice details
    And the invoice should show status "Paid" and "Archived"

  Scenario: Verify data persistence after page refresh
    Given I have completed the business workflow
    When I refresh the page
    And I navigate to the companies page
    Then I should see "Acme Consulting Ltd"
    When I navigate to the customers page
    Then I should see "Jane Smith"
    When I navigate to the quotes page
    Then I should see "Website Redesign Project"
    When I navigate to the invoices page
    Then I should see the converted invoice
    When I navigate to the archived invoices page
    Then I should see the archived invoice

  Scenario Outline: Create multiple quotes with different tax rates
    Given I have a customer "<customer_name>"
    When I create a quote with:
      | customer    | <customer_name> |
      | title       | <project_title> |
      | price       | <price>         |
      | taxRate     | <tax_rate>      |
    Then I should see the total amount "<expected_total>"

    Examples:
      | customer_name | project_title      | price | tax_rate | expected_total |
      | Jane Smith    | Mobile App Dev     | 10000 | 8.5      | $10,850.00     |
      | Jane Smith    | SEO Optimization   | 5000  | 8.5      | $5,425.00      |
      | Jane Smith    | Content Creation   | 3000  | 8.5      | $3,255.00      |

  Scenario: Handle quote rejection and revision
    Given I have created a quote "Design Proposal"
    When I view the quote in public view as customer
    And I click the "Deny" button
    And I provide rejection reason "Need to adjust scope"
    Then I should see the status "Denied"
    And I should see the denial reason "Need to adjust scope"
    When I create a revised quote based on the denied quote
    Then I should see the new quote with reference to original

  Scenario: Handle invoice payment failures
    Given I have an approved invoice
    When I attempt to record a payment with invalid details
    Then I should see a payment error message
    And the invoice status should remain "Unpaid"
    When I record a payment with valid details
    Then the payment should be successful
    And the invoice status should change to "Paid"

  Scenario: View invoice history and timeline
    Given I have completed a full invoice lifecycle
    When I view the invoice details
    Then I should see the complete timeline:
      | event                | status    |
      | Quote created        | Draft     |
      | Quote sent           | Sent      |
      | Quote approved       | Approved  |
      | Converted to invoice | Converted |
      | Invoice sent         | Sent      |
      | Invoice approved     | Approved  |
      | Payment received     | Paid      |
      | Invoice archived     | Archived  |

  Scenario: Export invoice to PDF
    Given I have a paid invoice
    When I click the "Export PDF" button
    Then a PDF file should be downloaded
    And the PDF should contain all invoice details
    And the PDF should include the company logo and template styling

  Scenario: Send invoice via email
    Given I have an approved invoice
    When I click the "Send Invoice" button
    And I enter the customer email "jane.smith@example.com"
    And I customize the email message
    And I click "Send"
    Then I should see "Invoice sent successfully"
    And the customer should receive the email with invoice link
    And the invoice status should update to "Sent"
