import * as shuffleSeed from "shuffle-seed";
import * as _ from "lodash";

export default class ParseData {
    facebookData;
    randomSeed;
    commentWeight = 2;
    likesWeight = 1;
    friendsArray;

    constructor(data, randomSeed) {
        this.facebookData = data;
        this.randomSeed = randomSeed;
    }

    public analizeDomElement(domString): string {
        let replacedText: string = domString.replace(/\{(.*?)\}/g, function (g0, g1) {
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
            let url = `https://graph.facebook.com/${id}?fields=first_name&access_token=${accessToken}`;
            promiseArray.push(
                fetch(url, { method: "GET" })
                    .then(res => res.json())
                    .then((res) => {
                        let id = res.id;
                        let index = _.findIndex(this.friendsArray, (friend) => { return friend.id == id })
                        this.friendsArray[index]["first_name"] = res["first_name"];
                    })
                    .catch(err => console.log(err))
            )
        }

        return Promise.all(promiseArray);
    }

    getMyFirstName() {
        return this.facebookData.aboutMe.first_name;
    }

    getMyGender() {
        return this.facebookData.aboutMe.gender;
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

        _.forEach(albumData, (value, key) => {
            let albumName = value.name;
            if (albumName === "Cover Photos" || albumName === "Profile Pictures") {
                let albumPhotos = value.photos.data;
                _.forEach(albumPhotos, (value, key) => {
                    //parse comments
                    if (value.comments) {
                        let comments = value.comments.data;
                        _.forEach(comments, (value, key) => {
                            let id = value.from.id;
                            friendsDataValue[id] = friendsDataValue[id] || {};
                            let lastValue = friendsDataValue[id].weight || 0;
                            lastValue += this.commentWeight;
                            let dataToEnter = { name: value.from.name, weight: lastValue };
                            friendsDataValue[id] = dataToEnter;
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

        let indexToSplice = Math.min(sortedArray.length, 20);
        let selectedFriendsArray = sortedArray.splice(0, indexToSplice);
        this.friendsArray = shuffleSeed.shuffle(selectedFriendsArray, this.randomSeed);
    }

}