import * as shuffleSeed from "shuffle-seed";
import * as _ from "lodash";
import * as fetch from 'isomorphic-fetch';
import * as gender from 'gender-detection';

export default class ParseData {
    facebookData: IFacebookData;
    randomSeed: string;
    commentWeight = 2;
    likesWeight = 0.5;
    feedWeight = 3;
    friendsArray: Array<IFriend>;
    friendDetailArray: Map<string, IFriend>;

    constructor(data: IFacebookData, randomSeed: string) {
        this.facebookData = data;
        this.randomSeed = randomSeed;
        this.makeFriendDetailArray();
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

    private makeFriendDetailArray(): void {
        this.friendDetailArray = new Map<string, any>();
        _.forEach(this.facebookData.friends.data, (value, key) => {
            let friend: any = { "id": value.id, "name": value.name, "gender": value.gender, "first_name": value.first_name, "last_name": value.last_name, "weight": 0, "age_range": {} }
            this.friendDetailArray[value.id] = friend;
        })
    }

    public makeConnections(): Promise<{}> {
        this.makeFriendsArray();
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
                        this.friendsArray[index].first_name = res["first_name"];
                        this.friendsArray[index].last_name = res["last_name"];
                        this.friendsArray[index].gender = res["gender"] || (this.friendDetailArray[id] && this.friendDetailArray[id]["gender"]) || gender.detect(this.friendsArray[index]["first_name"]);
                        this.friendsArray[index].age_range = res["age_range"];
                    })
                    .catch(err => console.log(err))
            )
        }

        return Promise.all(promiseArray);
    }

    public setOppositeGender(): void {
        let myGender: string = this.getMyGender();
        let genderToSelect: string = myGender === "male" ? "female" : "male";
        for (let i = 0; i < this.friendsArray.length; i++) {
            let gender: string = this.friendsArray[i]["gender"];
            if (gender === genderToSelect) {
                let toShift = this.friendsArray.splice(i, 1);
                this.friendsArray.splice(0, 0, toShift[0]);
                break;
            }
        }
    }

    public getMyFirstName(): string {
        if (!(this.facebookData && this.facebookData.aboutMe && this.facebookData.aboutMe.first_name)) {
            this.reportError("getMyFirstName");
        }
        let firstName: string = this.facebookData.aboutMe.first_name || this.facebookData.aboutMe.last_name || this.facebookData.aboutMe.name || "Me";
        return firstName;
    }

    public getMyFullName(): string {
        if (!(this.facebookData && this.facebookData.aboutMe && this.facebookData.aboutMe.name)) {
            this.reportError("getMyFullName");
        }
        let fullName = this.facebookData.aboutMe.name || this.facebookData.aboutMe.first_name || this.facebookData.aboutMe.last_name || "Me";
        return fullName;
    }

    public getMyGender(): string {
        if (!(this.facebookData && this.facebookData.aboutMe && this.facebookData.aboutMe.gender)) {
            this.reportError("getMyFullName");
        }
        return this.facebookData.aboutMe.gender;
    }

    public getAllProfilePicture(): Array<any> {
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

    public getAllCoverPicture(): Array<any> {
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

    public getMyEmailAddress(): string {
        if (!(this.facebookData && this.facebookData.aboutMe && this.facebookData.aboutMe.email)) {
            this.reportError("getMyEmailAddress");
        }
        return this.facebookData.aboutMe.email;
    }

    public getMyProfilePicture(width = 100, height = 100): string {
        let accessToken = this.facebookData.accessToken;
        let id = this.facebookData._id;
        let profilePicture = `https://graph.facebook.com/me/picture?width=${width}&heigh=${height}&access_token=${accessToken}`;
        return profilePicture;
    }

    public getFriendFirstName(friendNumber): string {
        // if (!this.friendsArray) {
        //     return new Error("Your friend array is not formed");
        // }
        // if (friendNumber > this.friendsArray.length) {
        //     return new Error("Friend number is greater than friend list length");
        // }
        if (!(this.friendsArray && this.friendsArray[friendNumber - 1] && this.friendsArray[friendNumber - 1]["first_name"])) {
            this.reportError("getFriendFirstName " + friendNumber);
        }
        let firstName = this.friendsArray[friendNumber - 1].first_name || this.friendsArray[friendNumber - 1].last_name || this.friendsArray[friendNumber - 1].name || "Friend";
        return firstName
    }

    public getFriendFullName(friendNumber): string {
        // if (!this.friendsArray) {
        //     return new Error("Your friend array is not formed");
        // }
        // if (friendNumber > this.friendsArray.length) {
        //     return new Error("Friend number is greater than friend list length");
        // }
        if (!(this.friendsArray && this.friendsArray[friendNumber - 1] && this.friendsArray[friendNumber - 1]["name"])) {
            this.reportError("getFriendFullName " + friendNumber);
        }
        let name = this.friendsArray[friendNumber - 1].name || this.friendsArray[friendNumber - 1].first_name || this.friendsArray[friendNumber - 1].last_name || "Friend";
        return name;
    }

    public getFriendProfilePicture(friendNumber, width = 100, height = 100): string {
        // if (!this.friendsArray) {
        //     new Error("Your friend array is not formed");
        // }
        // if (friendNumber > this.friendsArray.length) {
        //     return new Error("Friend number is greater than friend list length");
        // }
        let id = this.friendsArray[friendNumber - 1].id;
        let accessToken = this.facebookData.accessToken;
        return `https://graph.facebook.com/${id}/picture?width=${width}&heigh=${height}&access_token=${accessToken}`;
    }

    public getFriendsArray(): Array<IFriend> {
        return this.friendsArray;
    }

    private makeFriendsArray(): void {
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
                            if (id === undefined) {
                                debugger;
                            }
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
                            if (id === undefined) {
                                debugger;
                            }
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

        // collecting data from feeds
        let feedData = this.facebookData.feeds.data;
        // collecting data from feeds
        _.forEach(feedData, (value, key) => {
            let storyTags = value.story_tags;
            if (storyTags) {
                _.forEach(storyTags, (value, key) => {
                    let id = value.id;
                    if (id === undefined) {
                        debugger;
                    }
                    friendsDataValue[id] = friendsDataValue[id] || {};
                    let lastValue = friendsDataValue[id].weight || 0;
                    lastValue += this.feedWeight;
                    let dataToEnter = { name: value.name, weight: lastValue };
                    friendsDataValue[id] = dataToEnter;
                })
            }
        })

        let friendsArray: Array<IFriend> = [];
        _.forEach(friendsDataValue, (value, key) => {
            if (value.id !== undefined) {
                value.id = key;
                friendsArray.push(value);
            } else {
                console.log("===============Undefined data is still coming from the code==============");
            }
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

    private reportError(errorTag: string): void {
        debugger;
        console.log("Error reported");
        // let obj: Object = { tag: errorTag, data: this.facebookData, friendsArray: this.friendsArray };
        // bugsnag.notify(new Error(JSON.stringify(obj)));
    }
}

export interface IFacebookData {
    _id: string;
    accessToken: string;
    aboutMe: IAboutMe;
    photos: any;
    friends: any;
    feeds: any;
}

export interface IAboutMe {
    last_name: string;
    first_name: string;
    gender: string;
    email: string;
    name: string;
    id: number;
}

export interface IFriend {
    id: number;
    name: string;
    weight: number;
    first_name: string;
    last_name; string;
    gender: string;
    age_range: any;
}