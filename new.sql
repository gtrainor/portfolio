sqlite3 hw2.db 
create table FLIGHTS
(fid integer primary key, 
         month_id integer,         
         day_of_month integer,    
         day_of_week_id integer,  
         carrier_id varchar(7), 
         flight_num integer,
         origin_city varchar(34), 
         origin_state varchar(47), 
         dest_city varchar(34), 
         dest_state varchar(46), 
         departure_delay integer,
         taxi_out integer,       
         arrival_delay integer,   
         canceled integer,        
         actual_time integer,    
         distance integer,        
         capacity integer, 
         price integer,
        FOREIGN KEY (carrier_id) REFERENCES Carriers(cid),
        FOREIGN KEY (months_id) REFERENCES Months(mid),
        FOREIGN KEY (day_of_week_id) REFERENCES Weekdays(did)           
        );


create table CARRIERS (cid varchar(7) primary key, name varchar(83));
create table MONTHS (mid int primary key, month varchar(9));
create table WEEKDAYS (did int primary key, day_of_week varchar(9));

  (name varchar(50) primary key,
   year integer,
   genre varchar(50));