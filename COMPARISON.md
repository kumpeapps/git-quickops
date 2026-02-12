# Git Helper: Shell Script vs Git QuickOps Extension

This document shows the mapping between the original bash script functionality and the Git QuickOps VS Code extension commands.

## Feature Comparison

| Shell Script Menu | VS Code Extension | Command ID |
|------------------|-------------------|------------|
| Main Menu | Main Menu Quick Pick | `git-quickops.showMenu` |
| Common Commands | Common Commands Menu | `git-quickops.common` |
| Branch Management | Branches Menu | `git-quickops.branches` |
| Commit History | History Menu | `git-quickops.history` |
| Cleanup | Cleanup Menu | `git-quickops.cleanup` |
| Stash | Stash Menu | `git-quickops.stash` |
| Tags | Tags Menu | `git-quickops.tags` |
| Remotes | Remotes Menu | `git-quickops.remotes` |
| Utilities | Utilities Menu | `git-quickops.utils` |

## Command Mappings

### Common Commands
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_status` | `cmdStatus()` | Show git status |
| `cmd_add` | `cmdAdd()` | Add changes to staging |
| `cmd_add_commit_push` | `cmdAddCommitPush()` | Add, commit, and push |
| `cmd_commit` | `cmdCommit()` | Commit staged changes |
| `cmd_push` | `cmdPush()` | Push to remote |
| `cmd_pull` | `cmdPull()` | Pull from remote |
| `cmd_fetch` | `cmdFetch()` | Fetch from remote |
| `cmd_log` | `cmdLog()` | View commit log |
| `cmd_diff` | `cmdDiff()` | View diff |

### Branch Management
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_branch_create` | `cmdBranchCreate()` | Create new branch |
| `cmd_branch_create_from` | `cmdBranchCreateFrom()` | Create branch from... |
| `cmd_branch_switch` | `cmdBranchSwitch()` | Switch to branch |
| `cmd_branch_rename` | `cmdBranchRename()` | Rename current branch |
| `cmd_branch_delete` | `cmdBranchDelete()` | Delete branch(es) |
| `cmd_merge` | `cmdMerge()` | Merge branch |

### Commit History
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_history_rewrite_to_single_commit` | `cmdHistoryRewriteToSingle()` | Squash to single commit |
| `cmd_history_rebase_onto` | `cmdHistoryRebaseOnto()` | Rebase onto branch |
| `cmd_history_squash_last_n` | `cmdHistorySquashN()` | Squash last N commits |
| `cmd_history_undo_last_keep_changes` | `cmdHistoryUndoLast()` | Undo last commit (soft) |
| `cmd_history_amend_message` | `cmdHistoryAmendMessage()` | Amend commit message |

### Cleanup
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_cleanup_prune_fetch` | `cmdCleanupPruneFetch()` | Fetch and prune |
| `cmd_cleanup_delete_orphan_branches` | `cmdCleanupDeleteOrphans()` | Delete orphan branches |
| `cmd_cleanup_delete_merged_into_default` | `cmdCleanupDeleteMerged()` | Delete merged branches |

### Stash
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_stash_save` | `cmdStashSave()` | Save stash |
| `cmd_stash_list` | `cmdStashList()` | List stashes |
| `cmd_stash_pop` | `cmdStashPop()` | Pop stash |

### Tags
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_tag_create` | `cmdTagCreate()` | Create tag |

### Remotes
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_remotes_set_upstream_push` | `cmdRemotesSetUpstream()` | Push with upstream |

### Utilities
| Shell Function | VS Code Command | Description |
|---------------|-----------------|-------------|
| `cmd_utils_restore_file` | `cmdUtilsRestoreFile()` | Restore file from HEAD |
| `cmd_utils_unstage_all` | `cmdUtilsUnstageAll()` | Unstage all changes |
| `cmd_utils_set_prefix` | `cmdUtilsSetPrefix()` | Set commit prefix |

## UI Differences

### Shell Script (whiptail/dialog)
- Terminal-based TUI
- Menu navigation with arrow keys
- Text input boxes
- Checklist for multi-select
- Runs in terminal

### VS Code Extension
- Native VS Code Quick Pick UI
- Search-enabled menus
- Input boxes with validation
- Multi-select with checkboxes
- Integrated with VS Code workspace
- Output channels for command results
- Progress notifications

## Configuration Differences

### Shell Script
```bash
# Environment variable
export GIT_QUICKOPS_PREFIX="{{ticket}}: "

# Or repo-specific file
echo "{{ticket}}: " > .GIT_QUICKOPS_PREFIX
```

**Note:** Legacy `GIT_HELPER_PREFIX` and `.GIT_HELPER_PREFIX` are still supported for backwards compatibility.

### VS Code Extension
```json
{
  "gitQuickOps.commitPrefix": "{{ticket}}: ",
  "gitQuickOps.defaultRemote": "origin"
}
```

Or repo-specific:
```bash
echo "{{ticket}}: " > .GIT_QUICKOPS_PREFIX
```

**Note:** Legacy `.GIT_HELPER_PREFIX` files are also supported.

## Advantages of Each

### Shell Script Advantages
- No installation required (just bash)
- Portable across systems
- Works in pure terminal environments
- Can be aliased easily
- Lighter weight

### VS Code Extension Advantages
- Native VS Code integration
- Better visual interface
- Searchable menus
- Built-in settings management
- Progress notifications
- Output channels
- Can be published to marketplace
- Keyboard shortcut support
- Better error handling UI

## Both Support
- ✅ Commit message prefix templates
- ✅ `{{branch}}` and `{{ticket}}` placeholders
- ✅ Repo-specific `.GIT_QUICKOPS_PREFIX` file (with `.GIT_HELPER_PREFIX` legacy support)
- ✅ All git operations from the original script
- ✅ Git config checking and setup
- ✅ Multi-select operations
- ✅ Same command workflows

## Migration

Users can use both tools simultaneously:
- Shell script: `bash git-quickops.sh` or via alias
- VS Code: `Ctrl+Shift+P` → "Git QuickOps"

Both will respect the same `.GIT_QUICKOPS_PREFIX` file (or legacy `.GIT_HELPER_PREFIX`) if present in the repository.

## Future Enhancements

Potential features for the VS Code extension:
- [ ] Git graph visualization
- [ ] Conflict resolution helpers
- [ ] Custom command shortcuts
- [ ] Workspace-specific command history
- [ ] Integration with VS Code Source Control view
- [ ] Customizable menu items
- [ ] GitLens integration
