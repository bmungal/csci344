// global variables tracking the user's preferences:
let searchTerm = "";
let openOnly = false;

const search = (ev) => {
  ev.preventDefault(); // overrides default button action

  // Set user's preferences (global variables) from the DOM:
  searchTerm = document.querySelector("#search_term").value;
  openOnly = document.querySelector("#is_open").checked;

  // Invoke the show matching courses function
  showMatchingCourses();
};

// Part 1.1a
const isClassFull = (course) => {
  // modify this to accurately apply the filter:
  if (course.EnrollmentCurrent >= course.EnrollmentMax) {
    return false;
  }
  return true;
};

// Part 1.1b
const doesTermMatch = (course) => {
  // modify this to accurately apply the filter:
  //let match = false;
  //   if (course.Title.toLowerCase().includes(searchTerm.toLowerCase())) {
  //     return true;
  //   }
  //   return false;
  const searchTermLower = searchTerm.toLowerCase();
  return (
    course.Code.toLowerCase().includes(searchTermLower) ||
    course.Title.toLowerCase().includes(searchTermLower) ||
    course.Instructors.some((instructor) =>
      instructor.Name.toLowerCase().includes(searchTermLower)
    )
  );
};

// Part 1.2
const dataToHTML = (course) => {
  // modify this to be more detailed

  // hold open or closed for check mark
  let checkStat;

  if (isClassFull(course)) {
    //checkStat = `<i class="fa-solid fa-circle-xmark"></i> Closed`;
    checkStat = `<i class="fa-solid fa-circle-check"></i> Open`;
  } else {
    //checkStat = `<i class="fa-solid fa-circle-check"></i> Open`;
    checkStat = `<i class="fa-solid fa-circle-xmark"></i> Closed`;
  }
  // variable to hold number of seats/ make sure it isn't negative
  let seats = course.EnrollmentMax - course.EnrollmentCurrent;

  if (seats < 0) {
    seats = 0;
  }
  //followed format for the card
  // I did use the || TBD because that was a good idea from the solutions
  // <h2>CSCI 182.001: Intro to Programming: Media Applications</h2>
  //         <p>
  //             <i class="fa-solid fa-circle-check"></i>
  //             Open  &bull; 10174 &bull; Seats Available: 1
  //         </p>
  //         <p>
  //             MWF &bull; ZEI 201 &bull; 3 credit hour(s)
  //         </p>
  //         <p><strong>Whitley, Adam</strong></p>
  // backticks help with multi line strings and adding variables into that string
  return `
        <section class="course">
            <h2>${course.Code}: ${course.Title}</h2>
            <p>
            ${checkStat} &bull; ${course.CRN} &bull; Seats Available: ${seats}
            </p>
            <p>
            ${course.Days || "TBD"} &bull; ${
    course.Location.FullLocation || "TBD"
  } &bull; ${course.Hours} credit hour(s)
            </p>
            <p>
            ${course.Instructors[0].Name}
            </p>
        </section>
    `;
};

// Part 2
const showMatchingCourses = () => {
  console.log(`Search term: ${searchTerm}`);
  console.log(`Only show open classes: ${openOnly}`);
  console.log(`Course data:`, courseList);

  // clears out courses in the dom
  const courseContainer = document.querySelector(".courses");
  courseContainer.innerHTML = null;

  let filteredCourses = courseList.filter(doesTermMatch);

  if (openOnly) {
    filteredCourses = filteredCourses.filter(isClassFull);
  }

  filteredCourses.forEach((course) => {
    const snip = dataToHTML(course);
    courseContainer.insertAdjacentHTML("beforeend", snip);
  });

  // output all of the matching courses to the screen:
  // if (doesTermMatch) {
  //     dataToHTML;
  // }
};
