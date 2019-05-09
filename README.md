# Seat Finder App
Seat finder app is a web application that let users find a seat on a vehicle participating in Metro's Vanpool program
The user uses the zipcode of their starting destination usually a location close to home and the zipcode of the destination
usually their work location zipcode. If there is no results from the initial search the user can adjust the miles radius to
get more results. 

The app only finds seats on the first part of the trip which is from Home to Work. if the
user wants to find a vanpool from work to home they will need to call Metro Vanpool Program.

you can see it live at https://media.metro.net/seatfinder/index.html

# Development
### Built with

The following libraries display in the table below were used to develop this application:

| Library           | Purpose                    |
|:------------------|:---------------------------|
| Jquery            |Javascript library          |
| Handlebars templates  | Templating library     |
| Google Sheets API Before Google FusionTables API (shutdown 2019)  | Data source |

### Configuration

Project folder structure

| Location            |   Purpose                        |
|:--------------------|:---------------------------------|
|`directory root`     | readme, index                    |
|`/assets`            | graphics, logos, pictures etc.   |
|`/css`               | styling files.                   |
|`/js`                | javascript files                 |

### Deployment

The app is deploy to LACMTA AWS account. In order to deploy this app upload all the project files
to the S3 bucket called media.metro.net/seatfinder. 

## Author

Alvaro Ching

## Questions or Comments

E-mail: csinteractive@metro.net
