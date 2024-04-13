import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    /* 
    steps to register user
    1. inpute name, email, password etc (get user details from frontend{postman})
    2. validation - not empty 
    3. check if user already exists: using username, email
    4. check for images, check for avatar
    5. upload then to cloudinary, avatar
    6. create user object - create entry in DB
    7. remove password and refresh token field
    8. check for user creation
    9. return response
    */

    //input details
    const {username, fullName, email, password} = req.body;

    // validating if empty
    if(
        [username,fullName,email,password].some((field) => field?.trim() === "" )
    ) {
        throw new ApiError(400,`${field} is required`);
    }

    //checking if user exist or not in database
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser) {
        throw new ApiError(409, `user with email or username already exist`)
    }

    //check for images/avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, `Avatar file is required`);
    }

    //upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, `Avatar file is required`);
    }
    
    // create user object - create entry in DB\
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field if user is created
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while resitering the user");
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})

export {registerUser}