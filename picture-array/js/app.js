$(document).ready(function () {
  // Store profiles with emails and their associated images
  const profiles = {};

  // Sample images to choose from (using a static array of URLs for now)
  const availableImages = [
    "https://picsum.photos/200/300?random=1",
    "https://picsum.photos/200/300?random=2",
    "https://picsum.photos/200/300?random=3",
    "https://picsum.photos/200/300?random=4",
    "https://picsum.photos/200/300?random=5",
    "https://picsum.photos/200/300?random=6",
    "https://picsum.photos/200/300?random=7",
    "https://picsum.photos/200/300?random=8",
    "https://picsum.photos/200/300?random=9",
    "https://picsum.photos/200/300?random=10",
  ];

  // Display available images for selection
  function displayAvailableImages() {
    const imageSelectionContainer = $("#image-selection");
    imageSelectionContainer.empty(); // Clear the previous content

    availableImages.forEach((image, index) => {
      const imgElement = `<img src="${image}" alt="Image ${
        index + 1
      }" data-image="${image}" class="selectable-image" />`;
      imageSelectionContainer.append(imgElement);
    });
  }

  // Handle email form submission
  $("#email-form").submit(function (event) {
    event.preventDefault();
    const email = $("#email").val().trim();

    // Validate email format
    if (!validateEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Display the image selection section
    $(".email-section").hide();
    $(".image-selection-section").show();

    // Store email for profile creation
    $("#submit-images").data("email", email);

    // Display available images to select from
    displayAvailableImages();
  });

  // Validate email format
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  // Toggle the selection of images
  $("#image-selection").on("click", ".selectable-image", function () {
    $(this).toggleClass("selected");
  });

  // Save images and create profile
  $("#submit-images").click(function () {
    const email = $(this).data("email");
    const selectedImages = [];

    // Collect selected images
    $("#image-selection .selected").each(function () {
      selectedImages.push($(this).data("image"));
    });

    // Store profile data in the profiles object
    if (selectedImages.length > 0) {
      profiles[email] = selectedImages;
      displayProfiles();
    }

    // Reset the view to the email input section
    $(".email-section").show();
    $(".image-selection-section").hide();
    $("#email-form")[0].reset();
  });

  // Display the profiles with their images
  function displayProfiles() {
    const profilesList = $("#profiles-list");
    profilesList.empty(); // Clear existing profiles

    for (const email in profiles) {
      const images = profiles[email];
      let profileHtml = `<div class="profile-box"><h4>${email}</h4><div class="profile-images">`;

      images.forEach((image) => {
        profileHtml += `<img src="${image}" alt="Profile Image for ${email}" />`;
      });

      profileHtml += "</div></div>";
      profilesList.append(profileHtml);
    }
  }
});
