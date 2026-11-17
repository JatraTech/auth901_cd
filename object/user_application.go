// Copyright 2026 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package object

import (
	"fmt"

	"github.com/casdoor/casdoor/conf"
	"github.com/xorm-io/builder"
)

// UserApplication grants a user (owner/name) membership in an application
// beyond their home SignupApplication. One human (one owner/name row) can
// appear under multiple applications via these rows.
type UserApplication struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(255) notnull pk" json:"name"`
	Application string `xorm:"varchar(100) notnull pk" json:"application"`
}

func getUserApplicationTable() string {
	return conf.GetConfigString("tableNamePrefix") + "user_application"
}

func getUserTable() string {
	return conf.GetConfigString("tableNamePrefix") + "user"
}

func quoteIdent(name string) string {
	if ormer != nil && ormer.Engine != nil {
		return ormer.Engine.Quote(name)
	}
	return name
}

// AddUserApplication inserts a membership row idempotently.
func AddUserApplication(owner, name, application string) (bool, error) {
	if owner == "" || name == "" || application == "" {
		return false, nil
	}
	existed := &UserApplication{Owner: owner, Name: name, Application: application}
	has, err := ormer.Engine.Get(existed)
	if err != nil {
		return false, err
	}
	if has {
		return false, nil
	}
	affected, err := ormer.Engine.Insert(&UserApplication{Owner: owner, Name: name, Application: application})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

// RemoveUserApplication deletes one membership row.
func RemoveUserApplication(owner, name, application string) (bool, error) {
	if owner == "" || name == "" || application == "" {
		return false, nil
	}
	affected, err := ormer.Engine.Delete(&UserApplication{Owner: owner, Name: name, Application: application})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

// GetUserApplications returns the sorted membership application names for a user.
func GetUserApplications(owner, name string) ([]string, error) {
	rows := []*UserApplication{}
	err := ormer.Engine.Where("owner=? AND name=?", owner, name).Asc("application").Find(&rows)
	if err != nil {
		return nil, err
	}
	apps := make([]string, 0, len(rows))
	for _, r := range rows {
		apps = append(apps, r.Application)
	}
	return apps, nil
}

// SetUserApplications reconciles membership rows to exactly match desired.
// Empty desired clears all rows. Home-app access via signup_application is
// unaffected: removing the row for the home app does not revoke home access.
func SetUserApplications(owner, name string, desired []string) error {
	if owner == "" || name == "" {
		return nil
	}
	want := map[string]bool{}
	for _, a := range desired {
		if a != "" {
			want[a] = true
		}
	}
	existing, err := GetUserApplications(owner, name)
	if err != nil {
		return err
	}
	have := map[string]bool{}
	for _, a := range existing {
		have[a] = true
	}
	for a := range want {
		if !have[a] {
			if _, err := AddUserApplication(owner, name, a); err != nil {
				return err
			}
		}
	}
	for a := range have {
		if !want[a] {
			if _, err := RemoveUserApplication(owner, name, a); err != nil {
				return err
			}
		}
	}
	return nil
}

// IsUserInApplication is the single shared membership predicate core:
// home app OR an explicit membership row. Used by the login-impersonation
// gate so picker listing and login acceptance cannot drift.
func IsUserInApplication(user *User, appName string) bool {
	if user == nil || appName == "" {
		return false
	}
	if user.SignupApplication == appName {
		return true
	}
	existed := &UserApplication{Owner: user.Owner, Name: user.Name, Application: appName}
	has, err := ormer.Engine.Get(existed)
	if err != nil || !has {
		return false
	}
	return true
}

// BuildLoginImpersonationCond keeps count/list parity through the existing
// shared-cond pattern: home == app OR EXISTS membership row.
func BuildLoginImpersonationCond(applicationName string) builder.Cond {
	home := builder.Eq{"signup_application": applicationName}

	userTable := getUserTable()
	memberTable := getUserApplicationTable()
	qtUser := quoteIdent(userTable)
	qtMember := quoteIdent(memberTable)
	qOwner := quoteIdent("owner")
	qName := quoteIdent("name")
	qApp := quoteIdent("application")

	expr := fmt.Sprintf("EXISTS (SELECT 1 FROM %s WHERE %s.%s = %s.%s AND %s.%s = %s.%s AND %s.%s = ?)",
		qtMember,
		qtMember, qOwner, qtUser, qOwner,
		qtMember, qName, qtUser, qName,
		qtMember, qApp)

	return builder.Or(home, builder.Expr(expr, applicationName))
}

// ExtendUserWithApplications fills the transient Applications field.
func ExtendUserWithApplications(user *User) error {
	if user == nil {
		return nil
	}
	apps, err := GetUserApplications(user.Owner, user.Name)
	if err != nil {
		return err
	}
	user.Applications = apps
	return nil
}

// ExtendUsersWithApplications fills Applications for a batch; best-effort per user.
func ExtendUsersWithApplications(users []*User) error {
	for _, u := range users {
		if u == nil {
			continue
		}
		apps, err := GetUserApplications(u.Owner, u.Name)
		if err != nil {
			return err
		}
		u.Applications = apps
	}
	return nil
}
