SELECT venuelocations.VenueName, jubileeactivities.ActivityName, venuelocations.Capacity, COUNT(registrationinfo.MemberID) AS 'Number of people attending' FROM venuelocations 
	JOIN jubileeactivities 
		ON jubileeactivities.Venue = venuelocations.ID
	JOIN registrationinfo
		ON jubileeactivities.id = registrationinfo.ActivityID
	GROUP BY jubileeactivities.ID