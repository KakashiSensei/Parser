import * as shuffleSeed from "shuffle-seed";
import * as _ from "lodash";
import * as fetch from 'isomorphic-fetch';
import * as gender from 'gender-detection';

export default class ParseData {
    facebookData;
    randomSeed;
    commentWeight = 2;
    likesWeight = 1;
    feedWeight = 3;
    friendsArray;

    constructor(data, randomSeed) {
        this.facebookData = data;
        this.randomSeed = randomSeed;
    }

    public analizeDomElement(domString): string {
        let replacedText: string = domString.replace(/\{(.*?)\}/g, function(g0, g1) {
            let functionToCall = g1.replace("facebookData", "this");
            try {
                return eval(functionToCall);
            } catch (error) {
                return functionToCall;
            }
        }.bind(this))
        return replacedText;
    }

    makeConnections() {
        this.friendArray();
        let promiseArray = [];
        let accessToken = this.facebookData["accessToken"];
        for (let friend of this.friendsArray) {
            let id = friend.id;
            let url = `https://graph.facebook.com/${id}?fields=first_name,gender,last_name,age_range&access_token=${accessToken}`;
            promiseArray.push(
                fetch(url, { method: "GET" })
                    .then(res => res.json())
                    .then((res) => {
                        let id = res.id;
                        let index = _.findIndex(this.friendsArray, (friend) => { return friend.id == id })
                        this.friendsArray[index]["first_name"] = res["first_name"];
                        this.friendsArray[index]["last_name"] = res["last_name"];
                        this.friendsArray[index]["gender"] = gender.detect(this.friendsArray[index]["first_name"]);
                        this.friendsArray[index]["age_range"] = res["age_range"];
                    })
                    .catch(err => console.log(err))
            )
        }

        return Promise.all(promiseArray);
    }

    setOppositeGender() {
        let myGender: string = this.getMyGender();
        let genderToSelect: string = myGender === "male" ? "female" : "male";
        for (let i = 0; i < this.friendsArray.length; i++) {
            let gender: string = this.friendsArray[i]["gender"];
            if(gender === genderToSelect){
                let toShift = this.friendsArray.splice(i, 1);
                this.friendsArray.splice(0,0,toShift[0]);
                break;
            }
        }
    }

    getMyFirstName() {
        return this.facebookData.aboutMe.first_name;
    }

    getMyFullName() {
        return this.facebookData.aboutMe.name;
    }

    getMyGender() {
        return this.facebookData.aboutMe.gender;
    }

    getAllProfilePicture() {
        let profilePictureArray = [];
        _.forEach(this.facebookData.photos.data, (value, key) => {
            if (value.name === "Profile Pictures") {
                _.forEach(value.photos.data, (value, key) => {
                    let profilePicture = value.images;
                    profilePictureArray.push(profilePicture);
                })
            }
        })
        return profilePictureArray;
    }

    getAllCoverPicture() {
        let profilePictureArray = [];
        _.forEach(this.facebookData.photos.data, (value, key) => {
            if (value.name === "Cover Photos") {
                _.forEach(value.photos.data, (value, key) => {
                    let profilePicture = value.images;
                    profilePictureArray.push(profilePicture);
                })
            }
        })
        return profilePictureArray;
    }

    getMyEmailAddress() {
        return this.facebookData.aboutMe.email;
    }

    getMyProfilePicture(width = 100, height = 100) {
        let accessToken = this.facebookData.accessToken;
        let id = this.facebookData._id;
        let profilePicture = `https://graph.facebook.com/me/picture?width=${width}&heigh=${height}&access_token=${accessToken}`;
        return profilePicture;
    }

    getFriendFirstName(friendNumber) {
        if (!this.friendsArray) {
            return new Error("Your friend array is not formed");
        }
        if (friendNumber > this.friendsArray.length) {
            return new Error("Friend number is greater than friend list length");
        }
        return this.friendsArray[friendNumber - 1]["first_name"];
    }

    getFriendFullName(friendNumber) {
        if (!this.friendsArray) {
            return new Error("Your friend array is not formed");
        }
        if (friendNumber > this.friendsArray.length) {
            return new Error("Friend number is greater than friend list length");
        }
        return this.friendsArray[friendNumber - 1]["name"];
    }

    getFriendProfilePicture(friendNumber, width = 100, height = 100) {
        if (!this.friendsArray) {
            new Error("Your friend array is not formed");
        }
        if (friendNumber > this.friendsArray.length) {
            return new Error("Friend number is greater than friend list length");
        }
        let id = this.friendsArray[friendNumber - 1].id;
        let accessToken = this.facebookData.accessToken;
        return `https://graph.facebook.com/${id}/picture?width=${width}&heigh=${height}&access_token=${accessToken}`;
    }

    friendArray() {
        let albumData = this.facebookData.photos.data;
        let friendsDataValue = {};

        // collecting data from photos
        _.forEach(albumData, (value, key) => {
            let albumName = value.name;
            if (albumName === "Cover Photos" || albumName === "Profile Pictures") {
                let albumPhotos = value.photos.data;
                _.forEach(albumPhotos, (value, key) => {
                    //parse comments
                    if (value.comments) {
                        let commentArray = [];
                        let comments = value.comments.data;
                        _.forEach(comments, (value, key) => {
                            let id = value.from.id;
                            if (commentArray.indexOf(id) !== -1) {
                                return;
                            }
                            friendsDataValue[id] = friendsDataValue[id] || {};
                            let lastValue = friendsDataValue[id].weight || 0;
                            lastValue += this.commentWeight;
                            let dataToEnter = { name: value.from.name, weight: lastValue };
                            friendsDataValue[id] = dataToEnter;
                            commentArray.push(id);
                        })
                    }

                    //parse likes
                    if (value.likes) {
                        let likes = value.likes.data;
                        _.forEach(likes, (value, key) => {
                            let id = value.id;
                            friendsDataValue[id] = friendsDataValue[id] || {};
                            let lastValue = friendsDataValue[id].weight || 0;
                            lastValue += this.likesWeight;
                            let dataToEnter = { name: value.name, weight: lastValue };
                            friendsDataValue[id] = dataToEnter;
                        })
                    }
                })
            }
        })

        let feedData = this.facebookData.feeds.data;
        // collecting data from feeds
        _.forEach(feedData, (value, key) => {
            let storyTags = value.story_tags;
            if (storyTags) {
                _.forEach(storyTags, (value, key) => {
                    value = value[0];
                    let id = value.id;
                    friendsDataValue[id] = friendsDataValue[id] || {};
                    let lastValue = friendsDataValue[id].weight || 0;
                    lastValue += this.feedWeight;
                    let dataToEnter = { name: value.name, weight: lastValue };
                    friendsDataValue[id] = dataToEnter;
                })
            }
        })

        let friendsArray = [];
        _.forEach(friendsDataValue, (value, key) => {
            value.id = key;
            friendsArray.push(value);
        })

        // remove user own id from
        let userID = this.facebookData._id;

        let userIndex = _.findIndex(friendsArray, (item) => {
            return item.id === userID;
        })

        friendsArray.splice(userIndex, 1);

        //sort friends array
        let sortedArray = _.orderBy(friendsArray, ["weight"]).reverse();
        let indexToSplice = Math.min(sortedArray.length, 10);
        let selectedFriendsArray = sortedArray.splice(0, indexToSplice);

        this.friendsArray = shuffleSeed.shuffle(selectedFriendsArray, this.randomSeed);
    }
}