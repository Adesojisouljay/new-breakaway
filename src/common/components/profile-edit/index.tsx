import React from "react";
import { ActiveUser } from "../../store/active-user/types";
import { Account, FullAccount } from "../../store/accounts/types";
import BaseComponent from "../base";
import UploadButton from "../image-upload-button";
import { error, success } from "../feedback";
import { _t } from "../../i18n";
import { updateProfile } from "../../api/operations";
import { getAccount } from "../../api/hive";
import "./index.scss";
import { FormControl, InputGroup } from "@ui/input";
import { Spinner } from "@ui/spinner";
import { Button } from "@ui/button";

interface Props {
  activeUser: ActiveUser;
  account: Account;
  addAccount: (data: Account) => void;
  updateActiveUser: (data?: Account) => void;
}

interface State {
  name: string;
  about: string;
  website: string;
  location: string;
  coverImage: string;
  profileImage: string;
  pinned: string;
  inProgress: boolean;
  uploading: boolean;
  changed: boolean;
}

const pureState = (props: Props): State => {
  const profile =
    props.activeUser.data.__loaded && props.activeUser.data.profile
      ? props.activeUser.data.profile
      : {};

  return {
    uploading: false,
    inProgress: false,
    changed: false,
    name: profile.name || "",
    about: profile.about || "",
    website: profile.website || "",
    location: profile.location || "",
    coverImage: profile.cover_image || "",
    profileImage: profile.profile_image || "",
    pinned: profile.pinned || ""
  };
};

export default class ProfileEdit extends BaseComponent<Props, State> {
  state: State = pureState(this.props);

  valueChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const id = e.target.getAttribute("data-var") as string;
    const { value } = e.target;

    // @ts-ignore
    this.stateSet({ [id]: value, changed: true });
  };

  componentDidUpdate(prevProps: Props) {
    let currentAccount = this.props.account as FullAccount;
    let prevAccount = prevProps.account as FullAccount;
    const isSameAccount = prevAccount.name === currentAccount.name;
    const isImageChanged =
      prevAccount!.profile?.profile_image !== currentAccount!.profile?.profile_image;
    if (isSameAccount && isImageChanged && currentAccount.__loaded) {
      let newImage = currentAccount!.profile!.profile_image;
      this.setState({ profileImage: newImage || this.state.profileImage });
      this.props.updateActiveUser(this.props.account);
    }
  }

  update = () => {
    const { activeUser, addAccount, updateActiveUser } = this.props;

    const { name, about, location, website, coverImage, profileImage, pinned } = this.state;

    const newProfile = {
      name,
      about,
      cover_image: coverImage,
      profile_image: profileImage,
      website,
      location,
      pinned
    };

    this.stateSet({ inProgress: true });
    updateProfile(activeUser.data, newProfile)
      .then((r) => {
        success(_t("profile-edit.updated"));
        return getAccount(activeUser.username);
      })
      .then((account) => {
        // update reducers
        addAccount(account);
        updateActiveUser(account);
        this.stateSet({ changed: false });
      })
      .catch(() => {
        error(_t("g.server-error"));
      })
      .finally(() => {
        this.stateSet({ inProgress: false });
      });
  };

  render() {
    const {
      name,
      about,
      website,
      location,
      coverImage,
      profileImage,
      inProgress,
      uploading,
      changed
    } = this.state;

    const spinner = <Spinner className="mr-[6px] w-3.5 h-3.5" />;

    return (
      <div className="profile-edit">
        <div className="profile-edit-header">{_t("profile-edit.title")}</div>
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.name")}</label>
              <FormControl
                type="text"
                disabled={inProgress}
                value={name}
                maxLength={30}
                data-var="name"
                onChange={this.valueChanged}
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.about")}</label>
              <FormControl
                type="text"
                disabled={inProgress}
                value={about}
                maxLength={160}
                data-var="about"
                onChange={this.valueChanged}
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.profile-image")}</label>
              <InputGroup
                className="mb-3"
                append={
                  <UploadButton
                    {...this.props}
                    onBegin={() => {
                      this.stateSet({ uploading: true });
                    }}
                    onEnd={(url) => {
                      this.stateSet({ profileImage: url, uploading: false, changed: true });
                    }}
                  />
                }
              >
                <FormControl
                  type="text"
                  disabled={inProgress}
                  placeholder="https://"
                  value={profileImage}
                  maxLength={500}
                  data-var="profileImage"
                  onChange={this.valueChanged}
                />
              </InputGroup>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.cover-image")}</label>
              <InputGroup
                className="mb-3"
                append={
                  <UploadButton
                    {...this.props}
                    onBegin={() => {
                      this.stateSet({ uploading: true });
                    }}
                    onEnd={(url) => {
                      this.stateSet({ coverImage: url, uploading: false, changed: true });
                    }}
                  />
                }
              >
                <FormControl
                  type="text"
                  disabled={inProgress}
                  placeholder="https://"
                  value={coverImage}
                  maxLength={500}
                  data-var="coverImage"
                  onChange={this.valueChanged}
                />
              </InputGroup>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.website")}</label>
              <FormControl
                type="text"
                disabled={inProgress}
                placeholder="https://"
                value={website}
                maxLength={100}
                data-var="website"
                onChange={this.valueChanged}
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 xl:col-span-4">
            <div className="mb-4">
              <label>{_t("profile-edit.location")}</label>
              <FormControl
                type="text"
                disabled={inProgress}
                value={location}
                maxLength={30}
                data-var="location"
                onChange={this.valueChanged}
              />
            </div>
          </div>
        </div>
        {changed && (
          <Button
            icon={inProgress && spinner}
            onClick={this.update}
            disabled={inProgress || uploading}
          >
            {_t("g.update")}
          </Button>
        )}
      </div>
    );
  }
}
